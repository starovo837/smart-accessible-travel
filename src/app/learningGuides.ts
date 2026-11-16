import { copyDictionary as c } from './copyDictionary.ts'
import { learningSources } from './learningCatalog.ts'
export const accommodationTemplates=Object.entries(c.learningRequestDrafts).map(([id,copy])=>{
  const exam=['extraTime','room','sign','assistant'].includes(id)
  return {id,...copy,recipient:id==='funding'?c.learningFundingOffice:exam?c.learningExamOffice:c.learningSchoolOffice,
    leadTime:exam?c.learningLeadTimeExam:c.learningLeadTimeSchool,materials:exam?c.learningMaterialsExam:c.learningMaterialsGeneral,
    sourceUrl:exam?learningSources.exam:['description','seating','textbook'].includes(id)?learningSources.accesslaw:learningSources.education,
    verifiedAt:'2026-11-16',reviewDueAt:'2027-02-14'}
})
export const learningTutorials=Object.entries(c.learningTutorialCopy).map(([id,copy])=>({id,...copy,tool:({screen:'vision',image:'vision',listen:'communication',chapters:'steps',review:'reminders',notes:'learning'} as const)[id as keyof typeof c.learningTutorialCopy]}))
export function accommodationExport(ids:string[]):string {
  return [c.learningAccommodations,c.learningTemplateExportNote,c.learningTemplateBoundary,...accommodationTemplates.filter(row=>ids.includes(row.id)).flatMap(row=>[row.title,row.scene,c.learningRecipient+': '+row.recipient,c.learningLeadTime+': '+row.leadTime,c.learningMaterials+': '+row.materials,row.script,row.sourceUrl,c.learningCheckedAt+': '+row.verifiedAt])].join('\n\n')
}
