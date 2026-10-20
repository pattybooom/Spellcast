import { finalizePresentation } from '/Users/patrick/.codex/plugins/cache/openai-primary-runtime/presentations/26.1015.12040/skills/presentations/container_tools/artifact_tool_utils.mjs';
const root='/Users/patrick/Documents/ChatGPT/Spellcast';
const skill='/Users/patrick/.codex/plugins/cache/openai-primary-runtime/presentations/26.1015.12040/skills/presentations';
const result=await finalizePresentation({
 workspaceDir:root,
 candidatePath:root+'/.pitch-build/candidate.pptx',
 finalPath:root+'/output/pitch/Spellcast-Pitch.pptx',
 pythonExecutable:'/Users/patrick/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3',
 integrityValidatorPath:skill+'/container_tools/inspect_presentation_package_integrity.py',
 layoutValidatorPath:skill+'/container_tools/inspect_presentation_layout_geometry.py',
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit','--require-native-table-slide','5','--require-native-table-slide','11'],
 requiredNativeTableOwnerSlides:[5,11],
 fontPolicy:{basis:'design',families:['Helvetica Neue']},
 verifyArtifactToolImport:true,
 receiptPath:root+'/.pitch-build/validation.json'
});
console.log(JSON.stringify(result));
