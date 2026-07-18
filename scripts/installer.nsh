; VOX NSIS installer customizations
; Hooked by electron-builder's NSIS target via the extraResources installer.nsh file.
; Keep this file minimal and valid NSIS — it is merged into the generated installer.

!macro NSIS_HOOK_POSTINSTALL
  ; Nothing extra required — VOX runs fully self-contained.
!macroend
