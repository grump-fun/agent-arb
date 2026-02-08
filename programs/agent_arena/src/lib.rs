use anchor_lang::prelude::*;
use anchor_lang::system_program::{create_account, transfer, CreateAccount, Transfer};

declare_id!("7fqdzB8EBUcRP3omn8BPfitNAAFybcjv7CQT8V4AfeWT");

#[program]
pub mod agent_arena {
    use super::*;

    /// Initialize the arena. Sets the agent (authority) who alone can submit moves.
    /// Also creates the agent_treasury PDA so it can receive SOL from resolved rounds.
    pub fn init_arena(ctx: Context<InitArena>, agent_authority: Pubkey) -> Result<()> {
        let arena = &mut ctx.accounts.arena;
        arena.authority = agent_authority;
        arena.round = 0;
        arena.agent_wins = 0;
        arena.crowd_wins = 0;
        arena.bump = ctx.bumps.arena;

        let rent = Rent::get()?;
        let lamports = rent.minimum_balance(0);
        let bump = ctx.bumps.agent_treasury;
        let seeds: &[&[u8]] = &[b"agent_treasury", &[bump]];
        create_account(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                CreateAccount {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.agent_treasury.to_account_info(),
                },
                &[seeds],
            ),
            lamports,
            0,
            &ctx.program_id,
        )?;
        Ok(())
    }

    /// Agent-only: first move (round 0). No resolution; just advances to round 1.
    pub fn submit_move_first(ctx: Context<SubmitMoveFirst>, _move_choice: u8) -> Result<()> {
        let arena = &mut ctx.accounts.arena;
        require!(ctx.accounts.agent_signer.key() == arena.authority, ArenaError::NotAgent);
        require!(arena.round == 0, ArenaError::WrongRound);
        arena.round = 1;
        Ok(())
    }

    /// Agent-only: submit move for round > 0. Resolves previous round stakes and advances.
    pub fn submit_move(ctx: Context<SubmitMove>, move_choice: u8) -> Result<()> {
        let arena = &mut ctx.accounts.arena;
        require!(ctx.accounts.agent_signer.key() == arena.authority, ArenaError::NotAgent);
        require!(arena.round > 0, ArenaError::WrongRound);

        let prev_round = arena.round - 1;
        let round_state = &mut ctx.accounts.round_state;
        let total = round_state.agent_lamports + round_state.crowd_lamports;

        if total > 0 && !round_state.resolved {
            let agent_wins_round = move_choice == 0;
            if agent_wins_round {
                arena.agent_wins += 1;
            } else {
                arena.crowd_wins += 1;
            }
            let vault_info = ctx.accounts.round_vault.to_account_info();
            let treasury_info = ctx.accounts.agent_treasury.to_account_info();
            let (_, bump) = Pubkey::find_program_address(
                &[b"round_vault", &prev_round.to_le_bytes()[..]],
                ctx.program_id,
            );
            let seeds: &[&[u8]] = &[
                b"round_vault",
                &prev_round.to_le_bytes()[..],
                &[bump],
            ];
            let signer_seeds: &[&[&[u8]]] = &[seeds];
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: vault_info,
                    to: treasury_info,
                },
                signer_seeds,
            );
            transfer(cpi_ctx, total)?;
            round_state.resolved = true;
        }

        arena.round += 1;
        Ok(())
    }

    /// Stake SOL on the current round. Side: 0 = agent, 1 = crowd.
    pub fn stake(ctx: Context<Stake>, round: u64, side: u8, amount: u64) -> Result<()> {
        require!(side <= 1, ArenaError::InvalidSide);
        let round_state = &mut ctx.accounts.round_state;
        let arena = &ctx.accounts.arena;
        require!(round == arena.round, ArenaError::WrongRound);

        let vault_info = ctx.accounts.round_vault.to_account_info();
        if vault_info.lamports() == 0 {
            let rent = Rent::get()?;
            let lamports = rent.minimum_balance(0);
            let (_, bump) = Pubkey::find_program_address(
                &[b"round_vault", &round.to_le_bytes()[..]],
                ctx.program_id,
            );
            let seeds: &[&[u8]] = &[
                b"round_vault",
                &round.to_le_bytes()[..],
                &[bump],
            ];
            let signer_seeds: &[&[&[u8]]] = &[seeds];
            create_account(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    CreateAccount {
                        from: ctx.accounts.staker.to_account_info(),
                        to: vault_info,
                    },
                    signer_seeds,
                ),
                lamports,
                0,
                &ctx.program_id,
            )?;
        }

        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.staker.to_account_info(),
                to: ctx.accounts.round_vault.to_account_info(),
            },
        );
        transfer(transfer_ctx, amount)?;

        if side == 0 {
            round_state.agent_lamports += amount;
        } else {
            round_state.crowd_lamports += amount;
        }
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitArena<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + 32 + 8 + 8 + 8 + 1,
        seeds = [b"arena"],
        bump
    )]
    pub arena: Account<'info, Arena>,

    #[account(
        mut,
        seeds = [b"agent_treasury"],
        bump,
    )]
    pub agent_treasury: SystemAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitMoveFirst<'info> {
    #[account(
        mut,
        seeds = [b"arena"],
        bump = arena.bump,
    )]
    pub arena: Account<'info, Arena>,

    pub agent_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct SubmitMove<'info> {
    #[account(
        mut,
        seeds = [b"arena"],
        bump = arena.bump,
    )]
    pub arena: Account<'info, Arena>,

    pub agent_signer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"round", &(arena.round - 1).to_le_bytes()],
        bump,
    )]
    pub round_state: Account<'info, RoundState>,

    #[account(
        mut,
        seeds = [b"round_vault", &(arena.round - 1).to_le_bytes()],
        bump,
    )]
    pub round_vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"agent_treasury"],
        bump,
    )]
    pub agent_treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(round: u64)]
pub struct Stake<'info> {
    #[account(
        seeds = [b"arena"],
        bump = arena.bump,
    )]
    pub arena: Account<'info, Arena>,

    #[account(
        init_if_needed,
        payer = staker,
        space = 8 + 8 + 8 + 1,
        seeds = [b"round", round.to_le_bytes().as_ref()],
        bump
    )]
    pub round_state: Account<'info, RoundState>,

    #[account(
        mut,
        seeds = [b"round_vault", round.to_le_bytes().as_ref()],
        bump,
    )]
    pub round_vault: SystemAccount<'info>,

    #[account(mut)]
    pub staker: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct Arena {
    pub authority: Pubkey,
    pub round: u64,
    pub agent_wins: u64,
    pub crowd_wins: u64,
    pub bump: u8,
}

#[account]
pub struct RoundState {
    pub agent_lamports: u64,
    pub crowd_lamports: u64,
    pub resolved: bool,
}

#[error_code]
pub enum ArenaError {
    #[msg("Only the registered agent can submit a move")]
    NotAgent,
    #[msg("Invalid side (0 = agent, 1 = crowd)")]
    InvalidSide,
    #[msg("Round mismatch")]
    WrongRound,
}
