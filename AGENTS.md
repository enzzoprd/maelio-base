<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Application architecture
- Keep shared Maelio navigation in AppShell, rendered by the `_authenticated` layout around its Outlet; workspace sections live under it so every section is gated by sign-in, while landing and auth pages stay public.
- Read the student's identity only from the `profiles` row of the signed-in user (created by a signup trigger); privileged account actions run in authenticated server functions that verify the caller first.
- Keep empty workspace data in the browser-safe Maelio module; never seed examples or infer a student identity.
- Phase-one actions must disclose their unavailable state without saving, uploading, or producing results; reusable skeletons are reserved for actual pending navigation.
- Use global semantic design tokens and reusable Button variants for all presentation and controls to preserve consistent accessibility.
- Use a serialized autosave queue per note editor and flush before closing or internal navigation; this prevents stale writes and lost pending edits.
