import { useEffect, useState } from 'react'
import type {
  BiologicalCase,
  EvidencePhoto,
  FollowUpObservation,
  ImageObservation,
  ManagementOption,
  UserObservation,
  WorkflowView,
} from './biologicalCase'
import {
  createBiologicalCase,
  createDemonstrationCase,
  currentTimestamp,
  extractSuggestedSymptoms,
  newId,
  parseList,
  refreshCaseProfile,
  verifyBiologicalCase,
} from './biologicalCase'
import './WorkflowApp.css'

const CASES_KEY = 'host-vector-cases-v1'
const ACTIVE_CASE_KEY = 'host-vector-active-case-v1'
const IMAGE_FEATURES = ['Yellowing', 'Spots', 'Lesions', 'Curling', 'Wilting', 'Holes', 'Discoloration', 'Abnormal tissue']
const SPECIALIST_CATEGORIES = [
  'Municipal or provincial agriculture office',
  'Agricultural extension service',
  'Plant-health specialist or plant pathologist',
  'Entomologist or crop specialist',
  'Appropriate diagnostic laboratory',
]
const WORKFLOW_STEPS: [WorkflowView, string, string][] = [
  ['observe', '01', 'Observe'], ['profile', '02', 'Structure'], ['verify', '03', 'Verify'], ['assist', '04', 'Act'], ['follow', '05', 'Follow up'],
]

function loadCases(): BiologicalCase[] {
  try {
    const saved = window.localStorage.getItem(CASES_KEY)
    return saved ? JSON.parse(saved) as BiologicalCase[] : []
  } catch {
    return []
  }
}

function loadActiveId(): string {
  try {
    return window.localStorage.getItem(ACTIVE_CASE_KEY) ?? ''
  } catch {
    return ''
  }
}
function latest<T>(items: T[]): T | undefined {
  return items[items.length - 1]
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function statusLabel(status: BiologicalCase['status']): string {
  return status.replace(/_/g, ' ')
}

function canOpenStep(step: WorkflowView, record: BiologicalCase | null): boolean {
  if (step === 'home' || step === 'observe') return true
  if (step === 'assist' && !record) return true
  if (!record) return false
  if (step === 'profile') return record.userObservations.length > 0
  if (step === 'verify') return record.biologicalEntities.length > 0
  if (step === 'assist' || step === 'follow') return record.verificationResults.length > 0
  return false
}

async function compressPhoto(file: File): Promise<EvidencePhoto> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image compression is unavailable in this browser.')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return {
    id: newId(),
    name: file.name,
    dataUrl: canvas.toDataURL('image/jpeg', 0.74),
    capturedAt: currentTimestamp(),
  }
}

function App() {
  const [cases, setCases] = useState<BiologicalCase[]>(loadCases)
  const [activeCaseId, setActiveCaseId] = useState(loadActiveId)
  const [view, setView] = useState<WorkflowView>('home')
  const [toast, setToast] = useState('')
  const activeCase = cases.find((item) => item.caseId === activeCaseId) ?? null

  useEffect(() => {
    try {
      window.localStorage.setItem(CASES_KEY, JSON.stringify(cases))
      if (activeCaseId) window.localStorage.setItem(ACTIVE_CASE_KEY, activeCaseId)
      else window.localStorage.removeItem(ACTIVE_CASE_KEY)
    } catch {
      setToast('Browser storage is full. Export or remove older cases before adding more photographs.')
    }
  }, [cases, activeCaseId])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }

  const updateActiveCase = (change: (item: BiologicalCase) => BiologicalCase) => {
    if (!activeCaseId) return
    setCases((items) => items.map((item) => item.caseId === activeCaseId ? change(item) : item))
  }

  const startObservation = () => {
    const item = createBiologicalCase()
    setCases((items) => [item, ...items])
    setActiveCaseId(item.caseId)
    setView('observe')
  }

  const openDemonstration = () => {
    const item = createDemonstrationCase()
    setCases((items) => [item, ...items.filter((record) => record.caseId !== item.caseId)])
    setActiveCaseId(item.caseId)
    setView('verify')
  }

  const continueCase = (item: BiologicalCase) => {
    setActiveCaseId(item.caseId)
    if (item.status === 'NEW' || item.status === 'OBSERVATION_CAPTURED') setView('observe')
    else if (item.status === 'EVIDENCE_COMBINED' || item.status === 'PROFILE_CREATED' || item.status === 'RELATIONSHIPS_CONSTRUCTED') setView('profile')
    else if (item.status === 'ACTION_OPTIONS_AVAILABLE' || item.status === 'PATHWAY_SELECTED' || item.status === 'FOLLOW_UP_ACTIVE' || item.status === 'CASE_CLOSED') setView('follow')
    else setView('verify')
  }

  const saveObservation = (image: ImageObservation, human: UserObservation, photos: EvidencePhoto[]) => {
    const imageId = newId()
    const savedPhotos = photos.map((photo) => ({ ...photo, observationId: imageId }))
    updateActiveCase((item) => ({
      ...item,
      status: 'EVIDENCE_COMBINED',
      host: human.host,
      affectedTissue: human.tissue,
      symptoms: human.symptoms,
      duration: human.duration,
      environment: human.environment,
      photographs: [...item.photographs, ...savedPhotos],
      imageObservations: [...item.imageObservations, { ...image, id: imageId, photoIds: savedPhotos.map((photo) => photo.id) }],
      userObservations: [...item.userObservations, human],
      caseStatusNote: 'Image-observed features and user-reported observations are stored separately in this case.',
    }))
    setView('profile')
  }

  const buildProfile = () => {
    updateActiveCase((item) => ({ ...refreshCaseProfile(item), status: 'RELATIONSHIPS_CONSTRUCTED' }))
    setView('verify')
  }

  const runVerification = () => {
    updateActiveCase((item) => verifyBiologicalCase(item))
    notify('Relationship checks completed using the available reference records.')
  }

  const beginFollowUp = () => {
    updateActiveCase((item) => ({ ...item, status: 'FOLLOW_UP_ACTIVE', closedAt: null }))
    setView('follow')
  }

  const selectPathway = (category: ManagementOption['category']) => {
    updateActiveCase((item) => ({ ...item, selectedPathway: category, status: 'PATHWAY_SELECTED' }))
  }

  const saveFollowUp = (observation: FollowUpObservation) => {
    updateActiveCase((item) => ({
      ...item,
      status: 'FOLLOW_UP_ACTIVE',
      closedAt: null,
      photographs: [...item.photographs, ...observation.photographs],
      followUpObservations: [...item.followUpObservations, observation],
      observedChanges: [...item.observedChanges, `${dateLabel(observation.createdAt)}: ${observation.extent || 'extent not recorded'}; observed change only, no cause inferred.`],
      caseStatusNote: 'Follow-up appended to the original case. No causal conclusion is inferred from temporal change.',
    }))
    notify('Follow-up appended to the same biological case.')
  }

  const closeCase = () => {
    updateActiveCase((item) => ({ ...item, status: 'CASE_CLOSED', closedAt: currentTimestamp(), caseStatusNote: 'Case closed. The complete observation history remains saved.' }))
    notify('Case closed; its complete history remains saved.')
  }

  return (
    <div className="hv-app">
      <header className="site-header">
        <button className="wordmark" onClick={() => setView('home')} aria-label="HOST VECTOR home">
          <span className="wordmark-symbol">H<span>V</span></span>
          <span>HOST<span className="wordmark-slash">//</span>VECTOR</span>
        </button>
        <div className="header-right">
          {activeCase && <span className="active-case"><span className="status-light" />{activeCase.caseId}</span>}
          <button className="header-home" onClick={() => setView('home')}>CASE DESK</button>
        </div>
      </header>

      {view !== 'home' && (
        <nav className="workflow-nav" aria-label="Biological case workflow">
          <div className="workflow-progress"><span>CASE WORKFLOW</span><strong>STEP {String(WORKFLOW_STEPS.findIndex(([key]) => key === view) + 1).padStart(2, '0')} OF {WORKFLOW_STEPS.length}</strong></div>
          {WORKFLOW_STEPS.map(([key, number, label]) => (
            <button key={key} className={view === key ? 'current' : ''} onClick={() => setView(key)} disabled={!canOpenStep(key, activeCase)} aria-current={view === key ? 'step' : undefined} title={!canOpenStep(key, activeCase) ? `Complete the previous case steps before opening ${label.toLowerCase()}.` : undefined}>
              <span>{number}</span>{label}
            </button>
          ))}
        </nav>
      )}

      <main>
        {view === 'home' && <Home cases={cases} activeCase={activeCase} onStart={startObservation} onDemo={openDemonstration} onContinue={continueCase} onMonitor={activeCase ? beginFollowUp : startObservation} onHelp={() => setView('assist')} />}
        {view === 'observe' && activeCase && <ObservationCapture value={activeCase} onSave={saveObservation} notify={notify} />}
        {view === 'profile' && activeCase && <BiologicalProfile value={activeCase} onBack={() => setView('observe')} onContinue={buildProfile} />}
        {view === 'verify' && activeCase && <Verification value={activeCase} onRun={runVerification} onAssist={() => { updateActiveCase((item) => ({ ...item, status: 'ACTION_OPTIONS_AVAILABLE' })); setView('assist') }} />}
        {view === 'assist' && <Assistance value={activeCase} onSelect={selectPathway} onFollow={beginFollowUp} onHelp={() => notify('Live specialist directory unavailable. No names or contact details are fabricated.')} onResources={() => notify(activeCase ? `Resource lookup starts from ${activeCase.host || 'an unestablished host'} and the verified case; no authoritative directory is connected.` : 'Start or continue a case to connect resource information to its evidence.')} />}
        {view === 'follow' && activeCase && <CaseMonitoring value={activeCase} onSave={saveFollowUp} onContinue={beginFollowUp} onClose={closeCase} notify={notify} />}
      </main>

      <footer className="site-footer"><span>HOST//VECTOR</span><span>FIELD OBSERVATION SYSTEM · DEMONSTRATION PROTOTYPE</span><span>NO AUTOMATED DIAGNOSIS</span></footer>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}

function Home({ cases, activeCase, onStart, onDemo, onContinue, onMonitor, onHelp }: {
  cases: BiologicalCase[]
  activeCase: BiologicalCase | null
  onStart: () => void
  onDemo: () => void
  onContinue: (item: BiologicalCase) => void
  onMonitor: () => void
  onHelp: () => void
}) {
  return (
    <div className="home-screen">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-rule" />BIOLOGICAL HOST–PATHOGEN–VECTOR VERIFICATION</div>
          <h1>Evidence first.<br /><em>Relationships visible.</em></h1>
          <p>Combine crop photographs with field observations, check biological relationships against available references, and keep every follow-up attached to one case.</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={onStart}><span className="button-mark">＋</span>Start biological observation</button>
            <button className="button button-quiet" onClick={() => activeCase ? onContinue(activeCase) : onDemo()}>{activeCase ? 'Continue active case' : 'Open demonstration case'}<span aria-hidden="true">→</span></button>
          </div>
          <div className="hero-caveat"><span>!</span> Reference gaps are not proof of impossibility. Images are evidence, not diagnoses.</div>
        </div>
        <div className="hero-visual" aria-label="Biological observation workflow illustration">
          <div className="specimen-topline"><span>CASE LOGIC / 01</span><span>OBSERVE → VERIFY</span></div>
          <div className="specimen-art">
            <div className="specimen-grid" />
            <div className="specimen-stem" />
            <div className="leaf leaf-one" /><div className="leaf leaf-two" /><div className="leaf leaf-three" />
            <div className="specimen-node node-observe"><span>01</span>OBSERVE</div>
            <div className="specimen-node node-verify"><span>02</span>VERIFY</div>
            <div className="specimen-node node-follow"><span>03</span>FOLLOW</div>
            <div className="specimen-center">HV</div>
            <div className="specimen-coordinate">FIELD RECORD<br />ONE CASE · CHRONOLOGICAL</div>
          </div>
          <div className="specimen-bottomline"><span>PHOTO + FIELD NOTE</span><span>NO CONFIDENCE SCORE</span></div>
        </div>
      </section>

      <section className="flow-ribbon" aria-label="System flow">
        {['Observe', 'Structure', 'Verify', 'Understand', 'Act', 'Follow up'].map((step, index) => (
          <div className="flow-step" key={step}><span>{String(index + 1).padStart(2, '0')}</span><strong>{step}</strong>{index < 5 && <i aria-hidden="true">/</i>}</div>
        ))}
      </section>

      <section className="case-desk">
        <div className="section-heading"><div><div className="eyebrow">BIOLOGICAL CASE / WORKSPACE</div><h2>Continue the record.</h2></div><span>{cases.length} SAVED {cases.length === 1 ? 'CASE' : 'CASES'}</span></div>
        <div className="desk-actions">
          <button className="desk-action" onClick={onMonitor}><span className="action-icon">{activeCase ? '↗' : '＋'}</span><span><strong>{activeCase ? 'Monitor crop' : 'Start an observation'}</strong><small>{activeCase ? `Continue ${activeCase.caseId}` : 'Create a case before monitoring'}</small></span></button>
          <button className="desk-action" onClick={onHelp}><span className="action-icon">⌖</span><span><strong>Find agricultural help</strong><small>Specialist categories; no live directory connected</small></span></button>
          <button className="desk-action" onClick={onDemo}><span className="action-icon">D</span><span><strong>Demonstration case</strong><small>Synthetic references, conflicts and follow-up</small></span></button>
        </div>
        {cases.length > 0 ? (
          <div className="case-list">
            {cases.map((item) => (
              <article className={`case-row ${item.caseId === activeCase?.caseId ? 'selected' : ''}`} key={item.caseId}>
                <div className="case-row-main"><span className="case-row-id">{item.caseId}{item.demoMode && <b>DEMONSTRATION DATA</b>}</span><strong>{item.host || 'Host requires verification'}</strong><small>{item.affectedTissue || 'Tissue not recorded'} · {dateLabel(item.createdAt)}</small></div>
                <span className={`case-status status-${item.status.toLocaleLowerCase()}`}>{statusLabel(item.status)}</span>
                <button className="text-button" onClick={() => onContinue(item)}>{item.caseId === activeCase?.caseId ? 'Open case' : 'Continue case'} <span>→</span></button>
              </article>
            ))}
          </div>
        ) : <div className="empty-desk"><span className="empty-mark">01</span><p>No biological case is saved yet. Start an observation or load the demonstration record to follow the complete chain.</p></div>}
      </section>
      <div className="home-footnote"><span>01 — 30 OPERATIONS</span><p>One observation record connects evidence, explainable checks, assistance, and later observations. Missing reference information remains an evidence gap.</p></div>
    </div>
  )
}

function ObservationCapture({ value, onSave, notify }: { value: BiologicalCase; onSave: (image: ImageObservation, human: UserObservation, photos: EvidencePhoto[]) => void; notify: (message: string) => void }) {
  const previousHuman = latest(value.userObservations)
  const previousImage = latest(value.imageObservations)
  const [tissue, setTissue] = useState(previousImage?.tissue ?? '')
  const [features, setFeatures] = useState<string[]>(previousImage?.features ?? [])
  const [imageOrganisms, setImageOrganisms] = useState((previousImage?.organisms ?? []).join(', '))
  const [imageLocation, setImageLocation] = useState(previousImage?.organismLocation ?? '')
  const [imageNote, setImageNote] = useState(previousImage?.note ?? '')
  const [featureInput, setFeatureInput] = useState('')
  const [host, setHost] = useState(previousHuman?.host ?? value.host)
  const [humanTissue, setHumanTissue] = useState(previousHuman?.tissue ?? value.affectedTissue)
  const [symptoms, setSymptoms] = useState((previousHuman?.symptoms ?? value.symptoms).join(', '))
  const [duration, setDuration] = useState(previousHuman?.duration ?? value.duration)
  const [environment, setEnvironment] = useState(previousHuman?.environment ?? value.environment)
  const [organisms, setOrganisms] = useState((previousHuman?.organisms ?? []).join(', '))
  const [organismLocation, setOrganismLocation] = useState(previousHuman?.organismLocation ?? '')
  const [suspectedAgent, setSuspectedAgent] = useState(previousHuman?.suspectedAgent ?? '')
  const [vector, setVector] = useState(previousHuman?.vector ?? '')
  const [lifeStage, setLifeStage] = useState(previousHuman?.lifeStage ?? '')
  const [behavior, setBehavior] = useState(previousHuman?.behavior ?? '')
  const [transmissionPathway, setTransmissionPathway] = useState(previousHuman?.transmissionPathway ?? '')
  const [extent, setExtent] = useState(previousHuman?.extent ?? '')
  const [note, setNote] = useState(previousHuman?.note ?? '')
  const [photos, setPhotos] = useState<EvidencePhoto[]>([])
  const [busy, setBusy] = useState(false)
  const suggestions = extractSuggestedSymptoms(note)

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const newPhotos = await Promise.all(Array.from(files).map(compressPhoto))
      setPhotos((items) => [...items, ...newPhotos])
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not read one of the selected photographs.')
    } finally {
      setBusy(false)
    }
  }

  const submit = () => {
    const createdAt = currentTimestamp()
    const imageId = newId()
    const image: ImageObservation = {
      id: imageId, createdAt, tissue, features, organisms: parseList(imageOrganisms), organismLocation, note: imageNote,
      photoIds: photos.map((photo) => photo.id),
    }
    const human: UserObservation = {
      id: newId(), createdAt, host, tissue: humanTissue, symptoms: parseList(symptoms), duration, environment,
      organisms: parseList(organisms), organismLocation, suspectedAgent, vector, lifeStage, behavior, transmissionPathway, extent, note,
    }
    onSave(image, human, photos)
  }

  const addFeature = (feature: string) => {
    const value = feature.trim()
    if (value && !features.some((item) => item.toLowerCase() === value.toLowerCase())) setFeatures((items) => [...items, value])
    setFeatureInput('')
  }

  return (
    <div className="workflow-page">
      <PageHeading index="01 / 05" title="Record the observation." summary="Keep image-observed details distinct from the field report. Nothing on this screen is a diagnosis." badge={value.caseId} />
      {value.demoMode && <DemoBanner />}
      <div className="capture-grid">
        <section className="work-section image-section">
          <SectionHeading code="A" title="Photograph & image observations" label="IMAGE-OBSERVED FEATURES" />
          <p className="section-intro">Add one or more photographs of the whole plant, affected tissue, flowers, fruit, roots, or a visible organism. Images stay attached to this case.</p>
          <label className="upload-well">
            <input type="file" accept="image/*" capture="environment" multiple onChange={(event) => { void handleFiles(event.target.files); event.currentTarget.value = '' }} />
            <span className="upload-symbol">＋</span><strong>Capture or choose photographs</strong><small>Camera where supported · multiple images accepted</small>
          </label>
          <div className="photo-grid">
            {value.photographs.map((photo) => <PhotoTile key={photo.id} photo={photo} />)}
            {photos.map((photo) => <PhotoTile key={photo.id} photo={photo} onRemove={() => setPhotos((items) => items.filter((item) => item.id !== photo.id))} />)}
            {!value.photographs.length && !photos.length && <div className="photo-empty"><span>IMAGE EVIDENCE</span><small>No photograph added to this observation.</small></div>}
          </div>
          {busy && <div className="inline-status">Preparing photographs for local case storage…</div>}
          <div className="manual-analysis"><div className="callout-title"><span>i</span>Observation assistant unavailable</div><p>No multimodal service is configured in this prototype. Enter visible features yourself; no disease name will be inferred from the image.</p></div>
          <label className="field-label">Image-observed affected plant part<input value={tissue} onChange={(event) => setTissue(event.target.value)} placeholder="e.g. lower leaves" /></label>
          <div className="field-label">Visible features <span className="field-hint">Select only what you can see</span></div>
          <div className="feature-options">{IMAGE_FEATURES.map((feature) => <label className="check-chip" key={feature}><input type="checkbox" checked={features.includes(feature)} onChange={(event) => setFeatures((items) => event.target.checked ? [...items, feature] : items.filter((item) => item !== feature))} /><span>{feature}</span></label>)}</div>
          <div className="input-with-button"><input value={featureInput} onChange={(event) => setFeatureInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addFeature(featureInput) } }} placeholder="Add another visible feature" /><button type="button" className="small-button" onClick={() => addFeature(featureInput)}>Add feature</button></div>
          {features.length > 0 && <div className="tag-list">{features.map((feature) => <button key={feature} type="button" onClick={() => setFeatures((items) => items.filter((item) => item !== feature))}>{feature} <span aria-label="Remove">×</span></button>)}</div>}
          <div className="two-fields"><label className="field-label">Visible organisms<input value={imageOrganisms} onChange={(event) => setImageOrganisms(event.target.value)} placeholder="Comma-separated; describe appearance" /></label><label className="field-label">Organism location<input value={imageLocation} onChange={(event) => setImageLocation(event.target.value)} placeholder="e.g. underside of a leaf" /></label></div>
          <label className="field-label">Image note<textarea value={imageNote} onChange={(event) => setImageNote(event.target.value)} placeholder="Visible position, pattern, or other image-only detail" /></label>
        </section>

        <section className="work-section human-section">
          <SectionHeading code="B" title="Field report" label="USER-REPORTED OBSERVATIONS" />
          <p className="section-intro">Record what you observed. The original note and structured fields are both retained.</p>
          <label className="field-label">Crop / host<input value={host} onChange={(event) => setHost(event.target.value)} placeholder="e.g. Tomato" /></label>
          <div className="two-fields"><label className="field-label">Affected tissue<input value={humanTissue} onChange={(event) => setHumanTissue(event.target.value)} placeholder="e.g. young leaves" /></label><label className="field-label">Duration<input value={duration} onChange={(event) => setDuration(event.target.value)} placeholder="e.g. five days" /></label></div>
          <label className="field-label">Symptoms<input value={symptoms} onChange={(event) => setSymptoms(event.target.value)} placeholder="Comma-separated visible symptoms" /></label>
          {suggestions.length > 0 && <div className="suggestion-box"><span>Keyword suggestions from note, not AI:</span>{suggestions.map((item) => <button type="button" key={item} onClick={() => setSymptoms((value) => parseList(`${value}, ${item}`).join(', '))}>+ {item}</button>)}</div>}
          <label className="field-label">Human observation<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe when symptoms began, what changed, and where organisms were seen" /></label>
          <div className="two-fields"><label className="field-label">Observed organisms<input value={organisms} onChange={(event) => setOrganisms(event.target.value)} placeholder="Appearance or name, if known" /></label><label className="field-label">Organism location<input value={organismLocation} onChange={(event) => setOrganismLocation(event.target.value)} placeholder="Where it was observed" /></label></div>
          <label className="field-label">Environmental observations<textarea value={environment} onChange={(event) => setEnvironment(event.target.value)} placeholder="Recent rain, watering, temperature, location, or unknown" /></label>
          <div className="form-divider"><span>Optional biological details</span><i /></div>
          <label className="field-label">Suspected biological agent<input value={suspectedAgent} onChange={(event) => setSuspectedAgent(event.target.value)} placeholder="Leave blank if unknown; do not guess" /></label>
          <div className="two-fields"><label className="field-label">Suspected vector<input value={vector} onChange={(event) => setVector(event.target.value)} placeholder="Requires verification if uncertain" /></label><label className="field-label">Life stage<input value={lifeStage} onChange={(event) => setLifeStage(event.target.value)} placeholder="e.g. adult, larva, or unknown" /></label></div>
          <div className="two-fields"><label className="field-label">Observed behavior<input value={behavior} onChange={(event) => setBehavior(event.target.value)} placeholder="e.g. walking, feeding, unknown" /></label><label className="field-label">Proposed transmission<input value={transmissionPathway} onChange={(event) => setTransmissionPathway(event.target.value)} placeholder="Leave blank if unknown" /></label></div>
          <label className="field-label">Visible extent<input value={extent} onChange={(event) => setExtent(event.target.value)} placeholder="e.g. 12 affected leaves" /></label>
          <div className="save-row"><span>Both sources are saved to {value.caseId}.</span><button className="button button-primary" type="button" disabled={busy} onClick={submit}>Continue to biological profile <span>→</span></button></div>
        </section>
      </div>
    </div>
  )
}

function BiologicalProfile({ value, onBack, onContinue }: { value: BiologicalCase; onBack: () => void; onContinue: () => void }) {
  const human = latest(value.userObservations)
  const image = latest(value.imageObservations)
  const mismatch = Boolean(human?.tissue && image?.tissue && human.tissue.trim().toLowerCase() !== image.tissue.trim().toLowerCase())
  const [reviewed, setReviewed] = useState(false)
  const userPhotos = value.photographs.filter((photo) => image?.photoIds.includes(photo.id))

  return (
    <div className="workflow-page">
      <PageHeading index="02 / 05" title="Structure the evidence." summary="The biological profile brings both sources together without discarding either one." badge={value.caseId} />
      {value.demoMode && <DemoBanner />}
      {mismatch && <section className="discrepancy"><div className="discrepancy-head"><span>!</span><div><strong>Observation discrepancy</strong><small>Review before constructing biological relationships.</small></div></div><div className="discrepancy-values"><div><span>USER-DESCRIBED TISSUE</span><strong>{human?.tissue}</strong></div><div><span>IMAGE-OBSERVED TISSUE</span><strong>{image?.tissue}</strong></div></div><label className="review-check"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />I reviewed this difference. Preserve both sources and continue.</label></section>}
      <div className="profile-columns">
        <section className="profile-source source-human"><SectionHeading code="A" title="User-reported observations" label="ORIGINAL FIELD NOTE RETAINED" /><div className="profile-facts"><Fact label="Host" value={human?.host} /><Fact label="Affected tissue" value={human?.tissue} /><Fact label="Symptoms" value={human?.symptoms.join(', ')} /><Fact label="Duration" value={human?.duration} /><Fact label="Observed organisms" value={human?.organisms.join(', ')} /><Fact label="Organism location" value={human?.organismLocation} /><Fact label="Environment" value={human?.environment} /><Fact label="Suspected agent" value={human?.suspectedAgent} /><Fact label="Vector / transmission" value={[human?.vector, human?.transmissionPathway].filter(Boolean).join(' / ')} /><Fact label="Life stage / behavior" value={[human?.lifeStage, human?.behavior].filter(Boolean).join(' / ')} /></div><blockquote>{human?.note || 'No free-text observation supplied.'}</blockquote><small className="source-stamp">USER-REPORTED · {human ? dateLabel(human.createdAt) : 'INSUFFICIENT INFORMATION'}</small></section>
        <section className="profile-source source-image"><SectionHeading code="B" title="Image-observed features" label="NOT A CONFIRMED DIAGNOSIS" /><div className="profile-facts"><Fact label="Affected tissue" value={image?.tissue} /><Fact label="Visible features" value={image?.features.join(', ')} /><Fact label="Visible organisms" value={image?.organisms.join(', ')} /><Fact label="Organism location" value={image?.organismLocation} /></div><div className="profile-photos">{userPhotos.map((photo) => <PhotoTile key={photo.id} photo={photo} />)}{!userPhotos.length && <div className="photo-empty"><span>NO PHOTOGRAPH UPLOADED</span><small>Entered image features remain labeled as user-described visual observations.</small></div>}</div><p className="image-note">{image?.note || 'No separate image note supplied.'}</p><small className="source-stamp">IMAGE-OBSERVED · {image ? dateLabel(image.createdAt) : 'INSUFFICIENT INFORMATION'}</small></section>
      </div>

      <section className="entity-section"><div className="section-heading compact"><div><div className="eyebrow">STRUCTURED ENTITIES / CASE EVIDENCE</div><h2>What is established?</h2></div><span>UNKNOWN REMAINS UNKNOWN</span></div><div className="entity-list">{value.biologicalEntities.length ? value.biologicalEntities.map((entity, index) => <div className="entity-chip" key={`${entity.type}-${entity.value}-${index}`}><span>{entity.type.replace(/_/g, ' ')}</span><strong>{entity.value}</strong><small>{entity.source.replace(/_/g, ' ')}</small></div>) : <p className="empty-note">Profile entities are assembled when you continue to verification.</p>}</div></section>
      <div className="profile-actions"><button className="button button-quiet" onClick={onBack}>← Edit observation</button><div>{mismatch && !reviewed && <span className="required-note">Acknowledge the discrepancy to continue.</span>}<button className="button button-primary" disabled={mismatch && !reviewed} onClick={onContinue}>Construct relationships <span>→</span></button></div></div>
    </div>
  )
}

function Verification({ value, onRun, onAssist }: { value: BiologicalCase; onRun: () => void; onAssist: () => void }) {
  const human = latest(value.userObservations)
  const checked = value.verificationResults.length > 0
  return (
    <div className="workflow-page">
      <PageHeading index="03 / 05" title="Check each relationship." summary="Deterministic comparisons use only the local reference records. An absent relationship is an evidence gap, never proof of impossibility." badge={value.caseId} />
      {value.demoMode && <DemoBanner />}
      <RelationshipChain value={value} />
      <div className="verification-toolbar"><div><div className="eyebrow">REFERENCE SET</div><strong>{value.demoMode ? 'SYNTHETIC DEMONSTRATION DATA' : 'NO AUTHORITATIVE REFERENCE SET CONNECTED'}</strong><small>{value.demoMode ? 'Included to demonstrate result handling only; not scientific information.' : 'User-entered relationships will remain evidence gaps without an applicable reference.'}</small></div><button className="button button-primary" onClick={onRun}>{checked ? 'Run checks again' : 'Run biological verification'} <span>→</span></button></div>
      <section className="verification-results"><div className="table-heading"><span>RELATIONSHIP</span><span>STATUS</span><span>EXPLANATION / REFERENCE</span></div>
        {checked ? value.verificationResults.map((result) => <article className="verification-row" key={result.id}><div className="relationship-name"><strong>{result.relationship}</strong><small>Submitted: {result.submitted}</small></div><StatusBadge status={result.status} /><div className="result-explanation"><p>{result.explanation}</p><small>{result.reference ? `Reference: ${result.reference}` : 'Reference: Insufficient information'}</small></div></article>) : <div className="results-empty"><span>CHECKS NOT RUN</span><p>Construct a report from the current case evidence and available reference records.</p></div>}
      </section>
      {checked && <section className="report-block"><div className="report-index">REPORT / {value.caseId}</div><div><h2>Biological verification report</h2><p>{value.verificationReport}</p><div className="report-totals"><span><b>{value.verificationResults.filter((result) => result.status === 'CONSISTENT').length}</b> consistent</span><span><b>{value.evidenceGaps.length}</b> evidence gaps</span><span><b>{value.biologicalConflicts.length}</b> conflicts</span></div></div></section>}
      <div className="verification-bottom"><p>{human?.suspectedAgent ? `Suspected agent entered: ${human.suspectedAgent}.` : 'No biological agent was established from the available observation.'} No numerical AI confidence score is calculated.</p>{checked && <button className="button button-primary" onClick={onAssist}>Review next actions <span>→</span></button>}</div>
    </div>
  )
}

function Assistance({ value, onSelect, onFollow, onHelp, onResources }: {
  value: BiologicalCase | null
  onSelect: (category: ManagementOption['category']) => void
  onFollow: () => void
  onHelp: () => void
  onResources: () => void
}) {
  const lowCost = value?.managementOptions.filter((item) => item.category === 'LOW_COST_BIOLOGICAL') ?? []
  const professional = value?.managementOptions.filter((item) => item.category === 'PROFESSIONAL_COMMERCIAL') ?? []
  const confirmation = value?.managementOptions.filter((item) => item.category === 'PROFESSIONAL_CONFIRMATION') ?? []
  return (
    <div className="workflow-page">
      <PageHeading index="04 / 05" title="Choose a supported next step." summary="Options stay tied to this case. No product, treatment, specialist, or availability claim is generated without a source." badge={value?.caseId ?? 'NO CASE SELECTED'} />
      {value?.demoMode && <DemoBanner />}
      {!value && <div className="no-case-notice"><strong>No active biological case</strong><p>Specialist categories are shown below, but case-specific resource lookup needs a selected case record.</p></div>}
      <div className="assist-columns">
        <AssistanceGroup number="A" title="Low-cost / biological approach" tint="green" options={lowCost} selected={value?.selectedPathway === 'LOW_COST_BIOLOGICAL'} onSelect={() => onSelect('LOW_COST_BIOLOGICAL')} />
        <AssistanceGroup number="B" title="Professional / commercial approach" tint="coral" options={professional} selected={value?.selectedPathway === 'PROFESSIONAL_COMMERCIAL'} onSelect={() => onSelect('PROFESSIONAL_COMMERCIAL')} />
        <AssistanceGroup number="C" title="Professional confirmation" tint="blue" options={confirmation} selected={value?.selectedPathway === 'PROFESSIONAL_CONFIRMATION'} onSelect={() => onSelect('PROFESSIONAL_CONFIRMATION')} />
      </div>
      {value && value.managementOptions.length === 0 && <div className="inline-status">Run biological verification before choosing case-based management options.</div>}
      <section className="directory-section"><div><div className="eyebrow">LOCATE SUPPORT / STEPS 24–25</div><h2>Start with an appropriate source.</h2><p>The case can point toward relevant disciplines, but this prototype has no live location, office, product, or pricing data.</p></div><div className="directory-actions"><button className="button button-quiet" onClick={onHelp}>⌖ Find agricultural help</button><button className="button button-quiet" onClick={onResources}>＋ Find relevant resources</button></div></section>
      <div className="specialist-list">{SPECIALIST_CATEGORIES.map((category, index) => <div key={category}><span>0{index + 1}</span><strong>{category}</strong><small>Category available · local contact data unavailable</small></div>)}</div>
      <div className="resource-note"><span>RESOURCE LOOKUP</span><p>{value ? `Search basis: ${value.host || 'host not established'} · ${latest(value.userObservations)?.suspectedAgent || 'biological agent not established'} · ${value.caseId}. No authoritative source is connected, so no product or listing is presented.` : 'Select or create a case to begin from a verified biological problem. No marketplace listings are treated as scientific authority.'}</p></div>
      <div className="profile-actions"><span className="selected-path">{value?.selectedPathway ? `Selected pathway recorded: ${value.selectedPathway.replace(/_/g, ' ')}` : 'No pathway selected. The case remains open.'}</span><button className="button button-primary" onClick={onFollow} disabled={!value || value.verificationResults.length === 0}>Monitor this case <span>→</span></button></div>
    </div>
  )
}

function AssistanceGroup({ number, title, tint, options, selected, onSelect }: { number: string; title: string; tint: string; options: ManagementOption[]; selected: boolean; onSelect: () => void }) {
  return (
    <article className={`assist-group tint-${tint} ${selected ? 'is-selected' : ''}`}>
      <div className="assist-group-top"><span>{number}</span><span>{selected ? 'SELECTED' : 'PATHWAY'}</span></div><h2>{title}</h2>
      {options.length ? options.map((option) => <div className="management-option" key={option.id}><strong>{option.title}</strong><p>{option.biologicalBasis}</p><small>{option.caseCondition}</small><em>{option.source}</em></div>) : <p className="option-placeholder">{number === 'A' ? 'No action is generated until evidence is reviewed.' : 'Requires case verification and relevant authoritative information.'}</p>}
      <button className="select-path" disabled={!options.length} onClick={onSelect}>{selected ? 'Pathway recorded' : 'Select this approach'} <span>→</span></button>
    </article>
  )
}

function CaseMonitoring({ value, onSave, onContinue, onClose, notify }: {
  value: BiologicalCase
  onSave: (observation: FollowUpObservation) => void
  onContinue: () => void
  onClose: () => void
  notify: (message: string) => void
}) {
  const [tissue, setTissue] = useState('')
  const [symptoms, setSymptoms] = useState('')
  const [organisms, setOrganisms] = useState('')
  const [extent, setExtent] = useState('')
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<EvidencePhoto[]>([])
  const [busy, setBusy] = useState(false)
  const observations = [...value.followUpObservations].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const baseline = latest(value.userObservations)

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const prepared = await Promise.all(Array.from(files).map(compressPhoto))
      setPhotos((items) => [...items, ...prepared])
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Could not read one of the selected photographs.')
    } finally {
      setBusy(false)
    }
  }

  const submit = () => {
    const createdAt = currentTimestamp()
    const observation: FollowUpObservation = {
      id: newId(), caseId: value.caseId, createdAt, tissue, symptoms: parseList(symptoms), organisms: parseList(organisms), extent, note, photographs: photos,
    }
    onSave(observation)
    setTissue('')
    setSymptoms('')
    setOrganisms('')
    setExtent('')
    setNote('')
    setPhotos([])
  }

  const closed = value.status === 'CASE_CLOSED'
  return (
    <div className="workflow-page">
      <PageHeading index="05 / 05" title="Keep the case in motion." summary="Every new observation is appended to this case. The record describes observed change, not treatment causation." badge={value.caseId} />
      {value.demoMode && <DemoBanner />}
      <section className="monitor-summary"><div><div className="eyebrow">CASE MONITORING / {value.caseId}</div><h2>{value.host || 'Host requires verification'}</h2><p>Started {dateLabel(value.createdAt)} · {value.followUpObservations.length} follow-up {value.followUpObservations.length === 1 ? 'observation' : 'observations'}</p></div><span className={`case-status status-${value.status.toLocaleLowerCase()}`}>{statusLabel(value.status)}</span></section>
      <section className="history-section"><div className="section-heading compact"><div><div className="eyebrow">CHRONOLOGICAL RECORD</div><h2>Case history</h2></div><span>SAME CASE ID THROUGHOUT</span></div>
        <div className="timeline"><article className="timeline-entry baseline-entry"><div className="timeline-date">BASELINE<br />{dateLabel(value.createdAt)}</div><div className="timeline-content"><span>OBSERVATION 01 / BASELINE</span><strong>{baseline?.extent || baseline?.symptoms.join(' + ') || 'Initial observation'}</strong><p>{[baseline?.tissue, baseline?.symptoms.join(', '), baseline?.organisms.join(', ')].filter(Boolean).join(' · ') || 'Insufficient information recorded'}</p><small>{baseline?.note || 'No free-text field note.'}</small></div></article>
          {value.verificationResults.length > 0 && <article className="timeline-entry verification-entry"><div className="timeline-date">VERIFICATION<br />{dateLabel(value.createdAt)}</div><div className="timeline-content"><span>RELATIONSHIP CHECKS</span><strong>{value.verificationReport.split('\n')[0]}</strong><p>{value.verificationResults.length} checks · {value.evidenceGaps.length} gaps · {value.biologicalConflicts.length} conflicts</p></div></article>}
          {value.selectedPathway && <article className="timeline-entry action-entry"><div className="timeline-date">PATHWAY<br />RECORDED</div><div className="timeline-content"><span>USER SELECTED</span><strong>{value.selectedPathway.replace(/_/g, ' ')}</strong><p>No pathway was forced by the system.</p></div></article>}
          {observations.map((item, index) => <article className="timeline-entry follow-entry" key={item.id}><div className="timeline-date">FOLLOW-UP<br />{dateLabel(item.createdAt)}</div><div className="timeline-content"><span>OBSERVATION {String(index + 2).padStart(2, '0')} / APPENDED</span><strong>{item.extent || 'Extent not recorded'}</strong><p>{[item.tissue, item.symptoms.join(', '), item.organisms.join(', ')].filter(Boolean).join(' · ') || 'No additional structured detail'}</p><small>{item.note || 'No additional field note.'}</small>{item.photographs.length > 0 && <div className="photo-grid follow-photos">{item.photographs.map((photo) => <PhotoTile key={photo.id} photo={photo} />)}</div>}</div></article>)}
        </div>
        {baseline?.extent && observations.some((item) => item.extent) && <div className="extent-comparison"><span>OBSERVED EXTENT / NO CAUSAL INFERENCE</span><strong>{[baseline.extent, ...observations.map((item) => item.extent).filter(Boolean)].join('  →  ')}</strong></div>}
        {value.observedChanges.length > 0 && <p className="observed-change-note">{value.observedChanges[value.observedChanges.length - 1]}</p>}
      </section>

      {!closed ? <section className="follow-form"><div className="follow-form-copy"><div className="eyebrow">ADD FOLLOW-UP / STEP 27</div><h2>What changed since the last visit?</h2><p>Use the same case. Record only what was observed; time sequence does not establish cause.</p></div><div className="follow-form-fields"><label className="field-label">New photographs<label className="upload-inline"><input type="file" accept="image/*" capture="environment" multiple onChange={(event) => { void addPhotos(event.target.files); event.currentTarget.value = '' }} />＋ Add follow-up photographs</label></label><div className="photo-grid">{photos.map((photo) => <PhotoTile key={photo.id} photo={photo} onRemove={() => setPhotos((items) => items.filter((item) => item.id !== photo.id))} />)}</div><div className="two-fields"><label className="field-label">Affected tissue<input value={tissue} onChange={(event) => setTissue(event.target.value)} placeholder="e.g. young leaves" /></label><label className="field-label">Observed extent<input value={extent} onChange={(event) => setExtent(event.target.value)} placeholder="e.g. 8 affected leaves" /></label></div><label className="field-label">New symptoms<input value={symptoms} onChange={(event) => setSymptoms(event.target.value)} placeholder="Comma-separated" /></label><label className="field-label">Observed organisms<input value={organisms} onChange={(event) => setOrganisms(event.target.value)} placeholder="Comma-separated or unknown" /></label><label className="field-label">Field note<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="New visible details or environmental observations" /></label><button className="button button-primary" disabled={busy} onClick={submit}>Append follow-up observation <span>＋</span></button></div></section> : <div className="closed-record"><strong>CASE CLOSED</strong><p>The complete case history is preserved. Reopen monitoring to append another observation.</p><button className="button button-primary" onClick={onContinue}>Continue monitoring</button></div>}
      {!closed && <div className="case-end-actions"><button className="button button-quiet" onClick={onContinue}>Continue monitoring</button><button className="button button-danger" onClick={onClose}>Close case</button></div>}
    </div>
  )
}

function PageHeading({ index, title, summary, badge }: { index: string; title: string; summary: string; badge: string }) {
  return <header className="page-heading"><div><div className="eyebrow">{index} <span>·</span> HOST//VECTOR</div><h1>{title}</h1><p>{summary}</p></div><span className="page-case-id">{badge}</span></header>
}

function SectionHeading({ code, title, label }: { code: string; title: string; label: string }) {
  return <div className="section-heading-inner"><span className="section-code">{code}</span><div><h2>{title}</h2><span>{label}</span></div></div>
}

function Fact({ label, value }: { label: string; value?: string | null }) {
  return <div className="profile-fact"><span>{label}</span><strong>{value || 'Insufficient information'}</strong></div>
}

function PhotoTile({ photo, onRemove }: { photo: EvidencePhoto; onRemove?: () => void }) {
  return <figure className="photo-tile"><img src={photo.dataUrl} alt={`Evidence: ${photo.name}`} /><figcaption>{photo.name}</figcaption>{onRemove && <button type="button" aria-label={`Remove ${photo.name}`} onClick={onRemove}>×</button>}</figure>
}

function StatusBadge({ status }: { status: 'CONSISTENT' | 'EVIDENCE_GAP' | 'BIOLOGICAL_CONFLICT' }) {
  const label = status === 'EVIDENCE_GAP' ? 'EVIDENCE GAP / REQUIRES VERIFICATION' : status.replace(/_/g, ' ')
  return <span className={`result-status result-${status.toLowerCase()}`}><i />{label}</span>
}

function RelationshipChain({ value }: { value: BiologicalCase }) {
  const human = latest(value.userObservations)
  const links = [
    ['HOST', value.host], ['BIOLOGICAL AGENT', human?.suspectedAgent], ['TISSUE', value.affectedTissue], ['SYMPTOM', value.symptoms.join(', ')], ['VECTOR', human?.vector], ['TRANSMISSION', human?.transmissionPathway],
  ]
  return <section className="relationship-chain"><div className="chain-heading"><span>BIOLOGICAL RELATIONSHIP CHAIN</span><small>Only recorded evidence is shown; missing values remain open.</small></div><div className="chain-links">{links.map(([label, value], index) => <div className="chain-node-wrap" key={label}><div className="chain-node"><span>{label}</span><strong>{value || 'Insufficient information'}</strong></div>{index < links.length - 1 && <i aria-hidden="true">→</i>}</div>)}</div><div className="organism-chain"><span>ORGANISM</span><strong>{human?.organisms.join(', ') || 'Insufficient information'}</strong><i>→</i><span>LIFE STAGE</span><strong>{human?.lifeStage || 'Insufficient information'}</strong><i>→</i><span>BEHAVIOR</span><strong>{human?.behavior || 'Insufficient information'}</strong></div></section>
}

function DemoBanner() {
  return <div className="demo-banner"><span>D</span><p><strong>DEMONSTRATION DATA</strong> Synthetic reference relationships are included only to exercise the workflow. They are not scientific evidence and must not guide real-world treatment.</p></div>
}

export default App
