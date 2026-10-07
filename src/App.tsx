import { useState } from 'react'
import './App.css'

type View = 'home' | 'observe' | 'verify' | 'assist' | 'follow'
type CaseStatus = 'NEW' | 'OBSERVATION_CAPTURED' | 'VERIFICATION_COMPLETE' | 'FOLLOW_UP_ACTIVE' | 'CASE_CLOSED'
type ResultStatus = 'CONSISTENT' | 'EVIDENCE GAP' | 'BIOLOGICAL CONFLICT'

type VerificationResult = {
  relationship: string
  status: ResultStatus
  explanation: string
}

type BiologicalCase = {
  caseId: string
  createdAt: string
  status: CaseStatus
  host: string
  tissue: string
  symptoms: string[]
  duration: string
  environment: string
  photographs: string[]
  imageFeatures: string[]
  userObservation: string
  results: VerificationResult[]
  selectedPathway: string
  followUps: { date: string; extent: string; note: string }[]
}

const emptyCase = (): BiologicalCase => ({
  caseId: `HV-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
  createdAt: new Date().toISOString(),
  status: 'NEW',
  host: '', tissue: '', symptoms: [], duration: '', environment: '', photographs: [], imageFeatures: [], userObservation: '', results: [], selectedPathway: '', followUps: [],
})

const demoCase: BiologicalCase = {
  caseId: 'HV-2026-DEMO1', createdAt: '2026-09-18T08:20:00Z', status: 'VERIFICATION_COMPLETE',
  host: 'Tomato', tissue: 'Young leaves', symptoms: ['Yellowing', 'Curling'], duration: '5 days',
  environment: 'Warm, sheltered crop row; recent overhead watering.', photographs: ['demo-tomato-leaf.jpg'],
  imageFeatures: ['Yellowing visible on young leaves', 'Leaf curling', 'Small insect-like organisms visible beneath leaf'],
  userObservation: 'The lower leaves started turning yellow five days ago. The leaves are curling. I found tiny insects underneath the younger leaves.',
  selectedPathway: '', followUps: [{ date: 'Day 7', extent: '8 affected leaves', note: 'Yellowing still visible; fewer affected leaves observed.' }],
  results: [
    { relationship: 'Host ↔ Biological agent', status: 'CONSISTENT', explanation: 'The demonstration host and agent pairing is present in the demonstration reference set.' },
    { relationship: 'Biological agent ↔ Tissue', status: 'BIOLOGICAL CONFLICT', explanation: 'The entered tissue does not match the tissue association documented for this demonstration agent.' },
    { relationship: 'Biological agent ↔ Symptom', status: 'CONSISTENT', explanation: 'Yellowing and curling are listed in the demonstration reference set.' },
    { relationship: 'Biological agent ↔ Vector', status: 'EVIDENCE GAP', explanation: 'An insect-like organism is observed, but its identity and vector relationship require verification.' },
    { relationship: 'Life stage ↔ Behavior', status: 'EVIDENCE GAP', explanation: 'Life stage and behavior were not established from the available evidence.' },
  ],
}

function App() {
  const [view, setView] = useState<View>('home')
  const [currentCase, setCurrentCase] = useState<BiologicalCase | null>(null)
  const [toast, setToast] = useState('')

  const startCase = (seed = false) => {
    setCurrentCase(seed ? demoCase : emptyCase())
    setView(seed ? 'verify' : 'observe')
  }

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const updateCase = (patch: Partial<BiologicalCase>) => setCurrentCase((value) => value ? { ...value, ...patch } : value)

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')}><span className="brand-mark">HV</span><span>HOST<span className="slash">//</span>VECTOR</span></button>
        <div className="header-meta"><span className="live-dot" /> FIELD OBSERVATION SYSTEM <span className="case-pill">{currentCase ? currentCase.caseId : 'NO ACTIVE CASE'}</span></div>
      </header>
      {view !== 'home' && <nav className="workflow-nav">{[['observe', '01 Observe'], ['verify', '02 Verify'], ['assist', '03 Act'], ['follow', '04 Follow up']].map(([key, label]) => <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key as View)} disabled={!currentCase}>{label}</button>)}</nav>}
      <main>
        {view === 'home' && <Home startCase={startCase} setView={setView} currentCase={currentCase} />}
        {view === 'observe' && currentCase && <ObservationView value={currentCase} updateCase={updateCase} onContinue={() => { updateCase({ status: 'VERIFICATION_COMPLETE', results: demoCase.results }); setView('verify') }} />}
        {view === 'verify' && currentCase && <VerificationView value={currentCase} onAssist={() => setView('assist')} />}
        {view === 'assist' && currentCase && <AssistanceView value={currentCase} updateCase={updateCase} onFollow={() => { updateCase({ status: 'FOLLOW_UP_ACTIVE' }); setView('follow') }} notify={notify} />}
        {view === 'follow' && currentCase && <FollowUpView value={currentCase} updateCase={updateCase} notify={notify} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function Home({ startCase, setView, currentCase }: { startCase: (seed?: boolean) => void; setView: (view: View) => void; currentCase: BiologicalCase | null }) {
  return <div className="home page-grid"><section className="hero-panel"><div className="eyebrow">BIOLOGICAL CASE SYSTEM <span>•</span> PROTOTYPE</div><h1>See the whole<br /><em>relationship.</em></h1><p>HOST//VECTOR connects field photographs, human observations, biological reference checks, and follow-up history inside one continuous case record.</p><div className="hero-actions"><button className="primary-btn" onClick={() => startCase()}>Start biological observation <span>↗</span></button><button className="ghost-btn" onClick={() => startCase(true)}>Load demonstration case</button></div><div className="principle"><span className="principle-line" />PHOTO <b>+</b> FIELD NOTE <b>→</b> BIOLOGICAL EVIDENCE <b>→</b> VERIFIED ACTION</div></section><aside className="signal-panel"><div className="panel-label">CASE SIGNAL</div><div className="orbital"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="signal-core">HV</div><span className="node node-a">OBSERVE</span><span className="node node-b">VERIFY</span><span className="node node-c">FOLLOW</span></div><p>One case. Every observation preserved.</p></aside><section className="flow-strip"><div><span>01</span><strong>OBSERVE</strong><small>Capture evidence</small></div><i>→</i><div><span>02</span><strong>STRUCTURE</strong><small>Build the profile</small></div><i>→</i><div><span>03</span><strong>VERIFY</strong><small>Check relationships</small></div><i>→</i><div><span>04</span><strong>ACT / FOLLOW</strong><small>Keep the record alive</small></div></section><section className="home-lower"><div><div className="section-kicker">CONTINUE A CASE</div><h2>Nothing gets lost<br />between visits.</h2><p>Return to the same Biological Case to add evidence, review conflicts, choose a pathway, or monitor observed change.</p></div><div className="quick-actions"><button onClick={() => currentCase ? setView('follow') : startCase(true)}><span>↻</span> Monitor crop <small>{currentCase ? 'Open active case' : 'Use demonstration data'}</small></button><button onClick={() => currentCase ? setView('assist') : startCase(true)}><span>⌖</span> Find agricultural help <small>Availability varies by location</small></button></div></section></div>
}

function ObservationView({ value, updateCase, onContinue }: { value: BiologicalCase; updateCase: (patch: Partial<BiologicalCase>) => void; onContinue: () => void }) {
  const [imageAdded, setImageAdded] = useState(value.photographs.length > 0)
  return <div className="page-grid inner-page"><div className="page-heading"><div><div className="eyebrow">STEP 01—06 / OBSERVE</div><h1>Capture the biological<br /><em>observation.</em></h1></div><span className="status-tag">CASE OPEN</span></div><div className="observation-layout"><section className="evidence-card image-card"><div className="card-top"><span className="section-kicker">A / IMAGE EVIDENCE</span><span className="data-label">IMAGE-OBSERVED FEATURES</span></div><div className="upload-zone" onClick={() => { setImageAdded(true); updateCase({ photographs: ['field-observation.jpg'], imageFeatures: ['Yellowing visible on leaves', 'Curling at leaf margins', 'No definitive diagnosis made'] }) }}>{imageAdded ? <><div className="photo-placeholder">FIELD<br />PHOTO</div><strong>Photo evidence accepted</strong><small>Observable features only; no diagnosis declared.</small></> : <><div className="upload-icon">＋</div><strong>Upload field photographs</strong><small>Whole plant, affected tissue, or visible organism</small><span className="upload-note">Camera available on supported devices</span></>}</div><div className="feature-list">{(value.imageFeatures.length ? value.imageFeatures : ['No image evidence yet']).map((feature) => <span key={feature}>• {feature}</span>)}</div></section><section className="evidence-card"><div className="card-top"><span className="section-kicker">B / HUMAN EVIDENCE</span><span className="data-label">USER-REPORTED OBSERVATIONS</span></div><label>Crop / host<input value={value.host} onChange={(e) => updateCase({ host: e.target.value })} placeholder="e.g. Tomato" /></label><label>Affected tissue<input value={value.tissue} onChange={(e) => updateCase({ tissue: e.target.value })} placeholder="e.g. Young leaves" /></label><div className="two-fields"><label>Duration<input value={value.duration} onChange={(e) => updateCase({ duration: e.target.value })} placeholder="e.g. 5 days" /></label><label>Symptoms<input value={value.symptoms.join(', ')} onChange={(e) => updateCase({ symptoms: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} placeholder="Yellowing, curling" /></label></div><label>Field observation<textarea value={value.userObservation} onChange={(e) => updateCase({ userObservation: e.target.value })} placeholder="Describe what you saw, where, and when..." /></label><label>Environmental observations<input value={value.environment} onChange={(e) => updateCase({ environment: e.target.value })} placeholder="Recent rain, shade, watering, etc." /></label></section></div><div className="profile-preview"><div><div className="section-kicker">BIOLOGICAL OBSERVATION PROFILE</div><h2>{value.host || 'Host not established'} <span>·</span> {value.tissue || 'tissue not recorded'}</h2><p>{value.symptoms.length ? value.symptoms.join(' · ') : 'Symptoms not recorded'} <span className="muted">/ {value.duration || 'duration unknown'}</span></p></div><button className="primary-btn" onClick={onContinue} disabled={!imageAdded || !value.host}>Continue to verification <span>→</span></button></div></div>
}

function VerificationView({ value, onAssist }: { value: BiologicalCase; onAssist: () => void }) {
  return <div className="page-grid inner-page"><div className="page-heading"><div><div className="eyebrow">STEPS 07—20 / VERIFY + UNDERSTAND</div><h1>Make the relationships<br /><em>visible.</em></h1></div><span className="status-tag warn">REQUIRES REVIEW</span></div><section className="relationship-band"><div className="relationship-flow"><span>HOST<br /><b>{value.host || 'Unknown'}</b></span><i>→</i><span>BIOLOGICAL AGENT<br /><b>Demonstration agent</b></span><i>→</i><span>TISSUE<br /><b>{value.tissue || 'Unknown'}</b></span><i>→</i><span>SYMPTOM<br /><b>{value.symptoms[0] || 'Unknown'}</b></span></div><div className="relationship-note">Reference checks are explainable rules. An absent record is an evidence gap, not proof of impossibility.</div></section><section className="verification-card"><div className="card-top"><span className="section-kicker">BIOLOGICAL VERIFICATION REPORT</span><span className="data-label">NO CONFIDENCE SCORE</span></div><div className="result-table">{value.results.length ? value.results.map((result) => <div className="result-row" key={result.relationship}><div className={`result-icon ${result.status === 'CONSISTENT' ? 'good' : result.status === 'EVIDENCE GAP' ? 'gap' : 'conflict'}`}>{result.status === 'CONSISTENT' ? '✓' : result.status === 'EVIDENCE GAP' ? '?' : '!'}</div><div><strong>{result.relationship}</strong><span>{result.status}</span></div><p>{result.explanation}</p></div>) : <div className="empty-result">Complete the observation profile to run relationship checks.</div>}</div></section><div className="explain-banner"><span>!</span><p><strong>What this means:</strong> The case contains both supported relationships and unresolved evidence. Review the affected tissue and consider professional confirmation before treating the observation as a diagnosis.</p><button className="primary-btn" onClick={onAssist}>View next actions <span>→</span></button></div></div>
}

function AssistanceView({ value, updateCase, onFollow, notify }: { value: BiologicalCase; updateCase: (patch: Partial<BiologicalCase>) => void; onFollow: () => void; notify: (message: string) => void }) {
  return <div className="page-grid inner-page"><div className="page-heading"><div><div className="eyebrow">STEPS 21—26 / ACT</div><h1>Choose a path that<br /><em>fits the evidence.</em></h1></div><span className="status-tag">NO PATH FORCED</span></div><div className="pathway-grid"><Pathway icon="✦" title="Low-cost / biological" tone="green" copy="Accessible actions connected to the observed situation. These are not universally effective and should be reviewed as evidence develops." options={['Remove severely affected material', 'Inspect leaf undersides regularly', 'Record visible extent before and after each visit']} selected={value.selectedPathway} select={() => updateCase({ selectedPathway: 'Low-cost / biological' })} /><Pathway icon="＋" title="Professional / commercial" tone="amber" copy="Begin with the verified biological problem, then seek authoritative guidance. Marketplace listings are not scientific authority." options={['Plant-health specialist or extension service', 'Appropriate laboratory confirmation', 'Follow official product labels and professional guidance']} selected={value.selectedPathway} select={() => updateCase({ selectedPathway: 'Professional / commercial' })} /><Pathway icon="⌁" title="Professional confirmation" tone="blue" copy="Use when conflicts or evidence gaps make a field decision uncertain." options={['Plant pathologist', 'Entomologist or crop specialist', 'Municipal or provincial agriculture office']} selected={value.selectedPathway} select={() => updateCase({ selectedPathway: 'Professional confirmation' })} /></div><div className="finder-row"><button className="finder" onClick={() => notify('Live specialist data unavailable; no contact details fabricated.')}>⌖ <span>Find agricultural help<small>Live service data unavailable</small></span></button><button className="finder" onClick={() => notify(`Resources begin from the verified case: ${value.host || 'host not established'}.`)}>▣ <span>Find relevant resources<small>Authority and availability must be checked</small></span></button><button className="primary-btn" onClick={onFollow}>Monitor this crop <span>→</span></button></div></div>
}

function Pathway({ icon, title, tone, copy, options, selected, select }: { icon: string; title: string; tone: string; copy: string; options: string[]; selected: string; select: () => void }) { return <article className={`pathway-card ${tone} ${selected === title ? 'selected' : ''}`}><div className="pathway-icon">{icon}</div><div className="section-kicker">PATHWAY</div><h2>{title}</h2><p>{copy}</p><ul>{options.map((option) => <li key={option}>{option}</li>)}</ul><button className="select-btn" onClick={select}>{selected === title ? 'Selected ✓' : 'Select pathway'}</button></article> }

function FollowUpView({ value, updateCase, notify }: { value: BiologicalCase; updateCase: (patch: Partial<BiologicalCase>) => void; notify: (message: string) => void }) {
  const [extent, setExtent] = useState('')
  const [note, setNote] = useState('')
  const addFollowUp = () => { if (!extent) return; const next = [...value.followUps, { date: `Day ${value.followUps.length * 7 + 14}`, extent, note }]; updateCase({ followUps: next }); setExtent(''); setNote(''); notify('Follow-up appended to the same Biological Case.') }
  return <div className="page-grid inner-page"><div className="page-heading"><div><div className="eyebrow">STEPS 27—30 / FOLLOW UP</div><h1>Keep the case<br /><em>in motion.</em></h1></div><span className={`status-tag ${value.status === 'CASE_CLOSED' ? 'closed' : ''}`}>{value.status === 'CASE_CLOSED' ? 'CASE CLOSED' : 'MONITORING ACTIVE'}</span></div><section className="history-card"><div className="card-top"><span className="section-kicker">CASE HISTORY / {value.caseId}</span><span className="data-label">OBSERVED CHANGE ONLY</span></div><div className="timeline"><div className="timeline-item"><span>DAY 1</span><strong>{value.symptoms.length ? value.symptoms.join(' + ') : 'Initial observation'}</strong><small>Baseline evidence recorded</small></div>{value.followUps.map((followUp, index) => <div className="timeline-item" key={`${followUp.date}-${index}`}><span>{followUp.date}</span><strong>{followUp.extent}</strong><small>{followUp.note || 'Additional observation recorded.'}</small></div>)}</div><div className="change-line">{['12 affected leaves', ...value.followUps.map((item) => item.extent)].join('  →  ')}</div></section>{value.status !== 'CASE_CLOSED' && <section className="follow-form"><div><div className="section-kicker">ADD FOLLOW-UP OBSERVATION</div><h2>What changed since the last visit?</h2><p>Describe the observed change without claiming that an action caused it.</p></div><div className="follow-inputs"><input value={extent} onChange={(e) => setExtent(e.target.value)} placeholder="e.g. 5 affected leaves" /><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="New symptoms, organisms, tissue observations..." /><button className="primary-btn" onClick={addFollowUp}>Append observation <span>＋</span></button></div></section>}<div className="case-controls"><button className="ghost-btn" onClick={() => notify('Monitoring continues on this case.')}>Continue monitoring</button><button className="close-btn" onClick={() => { updateCase({ status: 'CASE_CLOSED' }); notify('Case history preserved and closed.') }}>Close case</button></div></div>
}

export default App
