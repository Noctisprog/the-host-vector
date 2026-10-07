export type CaseStatus =
  | 'NEW'
  | 'OBSERVATION_CAPTURED'
  | 'EVIDENCE_COMBINED'
  | 'PROFILE_CREATED'
  | 'RELATIONSHIPS_CONSTRUCTED'
  | 'VERIFICATION_COMPLETE'
  | 'ACTION_OPTIONS_AVAILABLE'
  | 'PATHWAY_SELECTED'
  | 'FOLLOW_UP_ACTIVE'
  | 'CASE_CLOSED'

export type VerificationStatus = 'CONSISTENT' | 'EVIDENCE_GAP' | 'BIOLOGICAL_CONFLICT'
export type WorkflowView = 'home' | 'observe' | 'profile' | 'verify' | 'assist' | 'follow'

export interface EvidencePhoto {
  id: string
  name: string
  dataUrl: string
  capturedAt: string
  observationId?: string
}

export interface ImageObservation {
  id: string
  createdAt: string
  tissue: string
  features: string[]
  organisms: string[]
  organismLocation: string
  note: string
  photoIds: string[]
}

export interface UserObservation {
  id: string
  createdAt: string
  host: string
  tissue: string
  symptoms: string[]
  duration: string
  environment: string
  organisms: string[]
  organismLocation: string
  suspectedAgent: string
  vector: string
  lifeStage: string
  behavior: string
  transmissionPathway: string
  extent: string
  note: string
}

export interface BiologicalEntity {
  type: 'HOST' | 'TISSUE' | 'SYMPTOM' | 'BIOLOGICAL_AGENT' | 'ORGANISM' | 'VECTOR' | 'LIFE_STAGE' | 'BEHAVIOR' | 'TRANSMISSION_PATHWAY'
  value: string
  source: 'user_reported' | 'image_observed' | 'demonstration_data'
}

export interface BiologicalRelationship {
  subject: string
  relationship: 'HOST_OF' | 'AFFECTS_TISSUE' | 'CAUSES_OR_ASSOCIATED_WITH_SYMPTOM' | 'VECTOR_OF' | 'TRANSMITTED_BY' | 'HAS_LIFE_STAGE' | 'EXHIBITS_BEHAVIOR'
  object: string
  source: 'case_evidence'
}

export interface VerificationResult {
  id: string
  relationship: string
  status: VerificationStatus
  submitted: string
  reference: string | null
  explanation: string
}

export interface ManagementOption {
  id: string
  title: string
  category: 'LOW_COST_BIOLOGICAL' | 'PROFESSIONAL_COMMERCIAL' | 'PROFESSIONAL_CONFIRMATION'
  biologicalBasis: string
  caseCondition: string
  source: string
}

export interface FollowUpObservation {
  id: string
  caseId: string
  createdAt: string
  tissue: string
  symptoms: string[]
  organisms: string[]
  extent: string
  note: string
  photographs: EvidencePhoto[]
}

export interface BiologicalCase {
  caseId: string
  createdAt: string
  status: CaseStatus
  demoMode: boolean
  host: string
  affectedTissue: string
  symptoms: string[]
  duration: string
  environment: string
  photographs: EvidencePhoto[]
  imageObservations: ImageObservation[]
  userObservations: UserObservation[]
  biologicalEntities: BiologicalEntity[]
  relationships: BiologicalRelationship[]
  verificationResults: VerificationResult[]
  evidenceGaps: string[]
  biologicalConflicts: string[]
  verificationReport: string
  explanations: string[]
  managementOptions: ManagementOption[]
  selectedPathway: ManagementOption['category'] | ''
  specialists: string[]
  resources: string[]
  followUpObservations: FollowUpObservation[]
  observedChanges: string[]
  caseStatusNote: string
  closedAt: string | null
}

interface ReferenceRelationship {
  subject: string
  relationship: BiologicalRelationship['relationship']
  object: string
  source: string
  exclusive?: boolean
}

const demoSource = 'Synthetic demonstration reference; not scientific evidence.'

const demonstrationKnowledgeBase: ReferenceRelationship[] = [
  { subject: 'Tomato', relationship: 'HOST_OF', object: 'DEMO-AGENT-01', source: demoSource },
  { subject: 'DEMO-AGENT-01', relationship: 'AFFECTS_TISSUE', object: 'stem', source: demoSource, exclusive: true },
  { subject: 'DEMO-AGENT-01', relationship: 'CAUSES_OR_ASSOCIATED_WITH_SYMPTOM', object: 'yellowing', source: demoSource },
  { subject: 'DEMO-AGENT-01', relationship: 'CAUSES_OR_ASSOCIATED_WITH_SYMPTOM', object: 'curling', source: demoSource },
  { subject: 'DEMO-ORGANISM-01', relationship: 'HAS_LIFE_STAGE', object: 'adult', source: demoSource },
  { subject: 'adult', relationship: 'EXHIBITS_BEHAVIOR', object: 'walking', source: demoSource },
]

const id = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const normalize = (value: string) => value.trim().toLocaleLowerCase()
const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))]
const latest = <T,>(values: T[]) => values[values.length - 1]

export function createBiologicalCase(): BiologicalCase {
  return {
    caseId: `HV-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    createdAt: now(),
    status: 'NEW',
    demoMode: false,
    host: '',
    affectedTissue: '',
    symptoms: [],
    duration: '',
    environment: '',
    photographs: [],
    imageObservations: [],
    userObservations: [],
    biologicalEntities: [],
    relationships: [],
    verificationResults: [],
    evidenceGaps: [],
    biologicalConflicts: [],
    verificationReport: '',
    explanations: [],
    managementOptions: [],
    selectedPathway: '',
    specialists: [],
    resources: [],
    followUpObservations: [],
    observedChanges: [],
    caseStatusNote: 'Observation started. No biological verification has been run.',
    closedAt: null,
  }
}

export function createDemonstrationCase(): BiologicalCase {
  const initialCase = createBiologicalCase()
  const createdAt = '2026-09-18T08:20:00.000Z'
  const humanObservation: UserObservation = {
    id: id(), createdAt, host: 'Tomato', tissue: 'Young leaves', symptoms: ['Yellowing', 'Curling'],
    duration: '5 days', environment: 'Warm, sheltered crop row; recent overhead watering.',
    organisms: ['Small insect-like organism'], organismLocation: 'Underside of young leaves',
    suspectedAgent: 'DEMO-AGENT-01', vector: '', lifeStage: 'Adult', behavior: 'Walking',
    transmissionPathway: '', extent: '12 affected leaves',
    note: 'The lower leaves started turning yellow five days ago. The leaves are curling. I found tiny insects underneath the younger leaves.',
  }
  const imageObservation: ImageObservation = {
    id: id(), createdAt, tissue: 'Young leaves',
    features: ['Yellowing visible on young leaves', 'Leaf curling', 'Small insect-like organisms visible beneath leaf'],
    organisms: ['Small insect-like organism'], organismLocation: 'Underside of young leaves',
    note: 'Demonstration image observations; not an image-based diagnosis.', photoIds: [],
  }
  const biologicalCase: BiologicalCase = {
    ...initialCase, caseId: 'HV-2026-DEMO1', createdAt, demoMode: true,
    status: 'VERIFICATION_COMPLETE', host: humanObservation.host, affectedTissue: humanObservation.tissue,
    symptoms: humanObservation.symptoms, duration: humanObservation.duration, environment: humanObservation.environment,
    userObservations: [humanObservation], imageObservations: [imageObservation],
    caseStatusNote: 'Demonstration data only. Relationship records are synthetic and are not scientific evidence.',
    followUpObservations: [{
      id: id(), caseId: 'HV-2026-DEMO1', createdAt: '2026-09-25T08:20:00.000Z', tissue: 'Young leaves',
      symptoms: ['Yellowing', 'Curling'], organisms: ['Small insect-like organism'], extent: '8 affected leaves',
      note: 'Yellowing still visible; fewer affected leaves observed. This is an observed change, not a causal claim.', photographs: [],
    }],
  }
  return verifyBiologicalCase(biologicalCase)
}

export function parseList(value: string): string[] {
  return unique(value.split(',').map((item) => item.trim()))
}

export function extractSuggestedSymptoms(note: string): string[] {
  const terms = ['yellowing', 'curling', 'wilting', 'spots', 'lesions', 'holes', 'discoloration']
  const lowerNote = note.toLocaleLowerCase()
  return terms.filter((term) => lowerNote.includes(term))
}

function compareReference(
  label: string,
  relationship: BiologicalRelationship['relationship'],
  subject: string,
  objects: string[],
): VerificationResult {
  const supplied = unique(objects)
  if (!subject || supplied.length === 0) {
    return {
      id: id(), relationship: label, status: 'EVIDENCE_GAP',
      submitted: [subject, ...supplied].filter(Boolean).join(' → ') || 'Insufficient information',
      reference: null,
      explanation: `Insufficient information was recorded to check ${label.toLocaleLowerCase()}. Requires verification.`,
    }
  }

  const records = demonstrationKnowledgeBase.filter((record) =>
    record.relationship === relationship && normalize(record.subject) === normalize(subject),
  )
  const exact = supplied.every((value) => records.some((record) => normalize(record.object) === normalize(value)))
  const isDemoSubject = /^DEMO-/i.test(subject) || /^DEMO-/i.test(supplied[0])
  const status: VerificationStatus = exact && records.length > 0
    ? 'CONSISTENT'
    : records.some((record) => record.exclusive) && isDemoSubject
      ? 'BIOLOGICAL_CONFLICT'
      : 'EVIDENCE_GAP'
  const reference = records.length ? records.map((record) => `${record.subject} → ${record.object} (${record.source})`).join('; ') : null
  const submitted = `${subject} → ${supplied.join(', ')}`
  const explanation = status === 'CONSISTENT'
    ? `The submitted relationship matches the available ${records[0].source.toLocaleLowerCase()} Record.`
    : status === 'BIOLOGICAL_CONFLICT'
      ? `The submitted relationship differs from the relationship documented in the synthetic demonstration reference. This is a demonstration conflict, not a real-world biological conclusion.`
      : `No applicable authoritative reference is available for this relationship. Absence from the reference set is an evidence gap, not proof that the relationship is impossible.`

  return { id: id(), relationship: label, status, submitted, reference, explanation }
}

function buildEntities(biologicalCase: BiologicalCase): BiologicalEntity[] {
  const human = latest(biologicalCase.userObservations)
  const image = latest(biologicalCase.imageObservations)
  const source = biologicalCase.demoMode ? 'demonstration_data' : 'user_reported'
  const entities: BiologicalEntity[] = []
  const add = (type: BiologicalEntity['type'], values: string[], entitySource = source) => {
    unique(values).forEach((value) => entities.push({ type, value, source: entitySource as BiologicalEntity['source'] }))
  }
  add('HOST', [biologicalCase.host])
  add('TISSUE', [biologicalCase.affectedTissue, image?.tissue ?? ''], image ? 'image_observed' : source)
  add('SYMPTOM', biologicalCase.symptoms)
  add('BIOLOGICAL_AGENT', [human?.suspectedAgent ?? ''])
  add('ORGANISM', [...(human?.organisms ?? []), ...(image?.organisms ?? [])], image ? 'image_observed' : source)
  add('VECTOR', [human?.vector ?? ''])
  add('LIFE_STAGE', [human?.lifeStage ?? ''])
  add('BEHAVIOR', [human?.behavior ?? ''])
  add('TRANSMISSION_PATHWAY', [human?.transmissionPathway ?? ''])
  return entities
}

function buildRelationships(biologicalCase: BiologicalCase): BiologicalRelationship[] {
  const human = latest(biologicalCase.userObservations)
  if (!human) return []
  const relationships: BiologicalRelationship[] = []
  const add = (subject: string, relationship: BiologicalRelationship['relationship'], object: string) => {
    if (subject.trim() && object.trim()) relationships.push({ subject: subject.trim(), relationship, object: object.trim(), source: 'case_evidence' })
  }
  add(human.host, 'HOST_OF', human.suspectedAgent)
  add(human.suspectedAgent, 'AFFECTS_TISSUE', human.tissue)
  human.symptoms.forEach((symptom) => add(human.suspectedAgent, 'CAUSES_OR_ASSOCIATED_WITH_SYMPTOM', symptom))
  add(human.suspectedAgent, 'VECTOR_OF', human.vector)
  add(human.vector, 'TRANSMITTED_BY', human.transmissionPathway)
  add(human.organisms[0] ?? '', 'HAS_LIFE_STAGE', human.lifeStage)
  add(human.lifeStage, 'EXHIBITS_BEHAVIOR', human.behavior)
  return relationships
}

function createManagementOptions(biologicalCase: BiologicalCase): ManagementOption[] {
  const affected = biologicalCase.affectedTissue || 'the reported plant tissue'
  return [
    {
      id: id(), title: 'Record the affected extent at each visit', category: 'LOW_COST_BIOLOGICAL',
      biologicalBasis: 'Repeated observations preserve visible change without implying that an action caused it.',
      caseCondition: `This case reports ${affected}; use the same counting method during follow-up.`,
      source: 'Current case observations; not a treatment claim.',
    },
    {
      id: id(), title: 'Avoid unverified treatment decisions', category: 'PROFESSIONAL_COMMERCIAL',
      biologicalBasis: 'The current verification includes evidence gaps or demonstration-only references; no product suitability has been established.',
      caseCondition: `Host: ${biologicalCase.host || 'not established'}; suspected agent: ${latest(biologicalCase.userObservations)?.suspectedAgent || 'not identified'}.`,
      source: 'Verification report; no product or registration data integrated.',
    },
    {
      id: id(), title: 'Request professional confirmation', category: 'PROFESSIONAL_CONFIRMATION',
      biologicalBasis: 'A qualified specialist can evaluate the original evidence and advise which additional checks are appropriate.',
      caseCondition: biologicalCase.evidenceGaps.length || biologicalCase.biologicalConflicts.length
        ? 'This case contains unresolved evidence gaps or conflicts.'
        : 'Use when the field observation needs independent confirmation.',
      source: 'No live specialist directory is connected.',
    },
  ]
}

export function verifyBiologicalCase(input: BiologicalCase): BiologicalCase {
  const human = latest(input.userObservations)
  const results = [
    compareReference('Host ↔ Biological agent', 'HOST_OF', input.host, [human?.suspectedAgent ?? '']),
    compareReference('Biological agent ↔ Tissue', 'AFFECTS_TISSUE', human?.suspectedAgent ?? '', [input.affectedTissue]),
    compareReference('Biological agent ↔ Symptom', 'CAUSES_OR_ASSOCIATED_WITH_SYMPTOM', human?.suspectedAgent ?? '', input.symptoms),
    compareReference('Biological agent ↔ Vector', 'VECTOR_OF', human?.suspectedAgent ?? '', [human?.vector ?? '']),
    compareReference('Vector ↔ Transmission', 'TRANSMITTED_BY', human?.vector ?? '', [human?.transmissionPathway ?? '']),
    compareReference('Life stage ↔ Behavior', 'EXHIBITS_BEHAVIOR', human?.lifeStage ?? '', [human?.behavior ?? '']),
  ]
  const evidenceGaps = results.filter((result) => result.status === 'EVIDENCE_GAP').map((result) => result.relationship)
  const biologicalConflicts = results.filter((result) => result.status === 'BIOLOGICAL_CONFLICT').map((result) => result.relationship)
  const explanations = results.map((result) => result.explanation)
  const hasIssues = evidenceGaps.length > 0 || biologicalConflicts.length > 0
  const report = `Overall case status: ${hasIssues ? 'REQUIRES BIOLOGICAL VERIFICATION' : 'RELATIONSHIPS CONSISTENT WITH AVAILABLE REFERENCE'}\n${evidenceGaps.length ? `Evidence gaps: ${evidenceGaps.join('; ')}. ` : ''}${biologicalConflicts.length ? `Conflicts: ${biologicalConflicts.join('; ')}.` : ''}${!hasIssues ? ' No numerical confidence score is used.' : ''}`
  const verified = {
    ...input,
    status: 'VERIFICATION_COMPLETE' as const,
    biologicalEntities: buildEntities(input),
    relationships: buildRelationships(input),
    verificationResults: results,
    evidenceGaps,
    biologicalConflicts,
    verificationReport: report,
    explanations,
    caseStatusNote: input.demoMode
      ? 'Demonstration data only. All demonstration reference relationships are synthetic and are not scientific evidence.'
      : 'Reference records are not integrated for user-supplied biological relationships; gaps require professional verification.',
  }
  return { ...verified, managementOptions: createManagementOptions(verified) }
}

export function refreshCaseProfile(input: BiologicalCase): BiologicalCase {
  const human = latest(input.userObservations)
  return {
    ...input,
    status: 'PROFILE_CREATED',
    host: human?.host ?? input.host,
    affectedTissue: human?.tissue ?? input.affectedTissue,
    symptoms: human?.symptoms ?? input.symptoms,
    duration: human?.duration ?? input.duration,
    environment: human?.environment ?? input.environment,
    biologicalEntities: buildEntities(input),
    relationships: buildRelationships(input),
    caseStatusNote: 'Biological profile assembled from the image-observed and user-reported evidence retained in this case.',
  }
}

export function newId(): string {
  return id()
}

export function currentTimestamp(): string {
  return now()
}
