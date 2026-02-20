import React, { useState, useMemo } from 'react'
import './CallMonitor.css'

const PARAM_TEMPLATES = [
  {
    key: 'opening',
    label: 'Opening and Closing',
    score: 5,
    mustDo: ['Clear, Branding', 'Greeting, Offer to Help'],
    shouldNot: ['Rush', 'Dull, Incorrect', 'Delay in greeting client >5 Sec'],
    mapping: { R: 0, A: 2, G: 5 },
  },
  {
    key: 'listening',
    label: 'Listening and Probing',
    score: 10,
    mustDo: ['Empathy, Paraphrasing', 'Verbal Cues', 'Probing'],
    shouldNot: ['Repeat', 'Interrupt', 'Irrelevant Probing'],
    mapping: { R: 0, A: 5, G: 10 },
  },
  {
    key: 'politeness',
    label: 'Politeness & Courtesy',
    score: 10,
    mustDo: ['Hold Procedure/Dead Air', 'Acknowledge', 'Proper Tone', 'Allow client to speak'],
    shouldNot: ['Irritation, Indifference', 'Inappropriate Words', 'Dull / Lack of Enthusiasm', 'Rude/Sarcastic'],
    mapping: { R: 0, A: 5, G: 10 },
  },
  {
    key: 'rapport',
    label: 'Rapport Building',
    score: 10,
    mustDo: ['Proper Pace', 'Assertive', 'Clear Explanation', 'Personalize / Ownership', 'Conviction'],
    shouldNot: ['Fast Pace', 'Aggressive', 'Confidential / personal information', 'Fumbling resulting in confusion'],
    mapping: { R: 0, A: 5, G: 10 },
  },
  {
    key: 'conversational',
    label: 'Conversational Skills',
    score: 5,
    mustDo: ['Jargon/Technical Term', 'Grammatically correct', 'Adhere to client language', 'Intonation'],
    shouldNot: ['Mechanical Script Reading (Monotonous)'],
    mapping: { R: 0, A: 2, G: 5 },
  },
  {
    key: 'correctness',
    label: 'Correctness & Accuracy (Query Resolution)',
    score: 35,
    mustDo: ['Correct & Accurate Information provided/Did not misguide the Client', 'Attempt to retain the client', 'Create interest in Client/Prospect', 'Objection Handling'],
    shouldNot: ['Provide wrong or misleading info'],
    mapping: { R: 0, A: 20, G: 35 },
  },
  {
    key: 'disposition',
    label: 'Disposition',
    score: 25,
    mustDo: ['All mandatory information captured accurately in CRM'],
    shouldNot: ['Mis-disposition'],
    mapping: { R: 0, A: 0, G: 25 },
  },
]

const defaultRow = (id) => ({
  id,
  srNo: id,
  creRealName: '',
  creLoginId: '',
  supervisor: '',
  manager: '',
  location: '',
  tenure: '',
  batch: '',
  process: '',
  monitoringPerson: '',
  clientPhone: '',
  projectType: '',
  serviceType: '',
  clientName: '',
  dateOfMonitoring: '',
  callDate: '',
  durationMinute: '',
  durationSecond: '',
  openingClosing: '',
  listeningProbing: '',
  politeness: '',
  rude: 'NO',
  rapport: '',
  conversationSkills: '',
  correctness: '',
  disposition: '',
  fatalError: 0,
  communicationScorable: 40,
  communicationScored: 0,
  productKnowledgeScorable: 35,
  productKnowledgeScored: 0,
  taggingScorable: 25,
  taggingScored: 0,
  // Per-parameter selections: R/A/G/NA and must/should-not checked items
  parameterSelections: PARAM_TEMPLATES.reduce((acc, p) => {
    acc[p.key] = { choice: 'NA', must: p.mustDo.map(() => false), shouldNot: p.shouldNot.map(() => false) }
    return acc
  }, {}),
})

export default function CallMonitor() {
  const [rows, setRows] = useState([defaultRow(1)])

  const addRow = () => setRows((r) => [...r, defaultRow(r.length + 1)])

  const updateCell = (id, key, value) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    )
  }

  const computedRows = useMemo(() => {
    // helper: compute parameter score using guide rules
    const computeParameterScore = (p, sel) => {
      // sel: { must: [bool...], shouldNot: [bool...], choice: 'R'|'A'|'G'|'NA' }
      const mustCount = (p.mustDo || []).length
      const shouldCount = (p.shouldNot || []).length
      const mustSatisfied = (sel && sel.must) ? sel.must.filter(Boolean).length : 0
      const mustFailures = mustCount - mustSatisfied
      const shouldViolations = (sel && sel.shouldNot) ? sel.shouldNot.filter(Boolean).length : 0

      // GREEN: all must satisfied AND no shouldNot violations
      if (mustFailures === 0 && shouldViolations === 0) return Number(p.score || 0)

      // RED heuristics: many failures/violations
      const redMustThreshold = Math.max(1, Math.ceil(mustCount * 0.6))
      const redShouldThreshold = Math.max(1, Math.ceil(shouldCount * 0.6))
      if (mustFailures >= redMustThreshold || shouldViolations >= redShouldThreshold) return 0

      // AMBER heuristics: some failures/violations
      const amberMustThreshold = Math.max(1, Math.ceil(mustCount * 0.3))
      if (mustFailures >= amberMustThreshold || shouldViolations >= 1) {
        // prefer mapping A if available
        if (p.mapping && typeof p.mapping['A'] !== 'undefined') return Number(p.mapping['A'])
        return Math.round((Number(p.score || 0) / 2) * 100) / 100
      }

      // Fallback: use explicit choice if provided
      if (sel && sel.choice && p.mapping && typeof p.mapping[sel.choice] !== 'undefined') return Number(p.mapping[sel.choice])

      return 0
    }

    return rows.map((row) => {
      // compute totals from parameter selections when available
      const totalScorable = PARAM_TEMPLATES.reduce((s, p) => s + Number(p.score || 0), 0)

      const totalScored = PARAM_TEMPLATES.reduce((sum, p) => {
        const sel = row.parameterSelections && row.parameterSelections[p.key]
        const sc = computeParameterScore(p, sel)
        return sum + Number(sc || 0)
      }, 0)

      const qualityPercent = totalScorable > 0 ? (totalScored / totalScorable) * 100 : 0

      return { ...row, totalScorable, totalScored, qualityPercent: qualityPercent.toFixed(2) }
    })
  }, [rows])

  const [scoringRowId, setScoringRowId] = useState(null)

  const toggleScoring = (id) => setScoringRowId((cur) => (cur === id ? null : id))

  const updateParameterChoice = (rowId, paramKey, choice) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row
        const sel = { ...(row.parameterSelections || {}) }
        sel[paramKey] = { ...(sel[paramKey] || {}), choice }
        return { ...row, parameterSelections: sel }
      }),
    )
  }

  const updateParameterCheckbox = (rowId, paramKey, listType, index, checked) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row
        const sel = { ...(row.parameterSelections || {}) }
        const arr = sel[paramKey] ? [...sel[paramKey][listType]] : []
        arr[index] = checked
        sel[paramKey] = { ...(sel[paramKey] || {}), [listType]: arr }
        return { ...row, parameterSelections: sel }
      }),
    )
  }

  const openFormWindow = (row) => {
    const w = window.open('', '_blank', 'width=1000,height=800,scrollbars=yes')
    if (!w) return alert('Popup blocked. Allow popups for this site to open the form.')

    const templates = JSON.stringify(PARAM_TEMPLATES)
    const rowData = JSON.stringify(row)

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Call Monitor Form - Row ${row.srNo}</title>
        <style>
          :root {
  --primary-dark: #6b1f2b;
  --primary-mid: #7a2530;
  --primary-light: #9a5a2a;

  --cream-bg: #fff3c4;
  --card-bg: #fff8de;
  --text-dark: #2d0e12;
  --text-muted-dark: rgba(91, 29, 38, 0.85);
  --input-bg: #fffbf0;
  --border-soft: rgba(91, 29, 38, 0.2);

  --text-light: #f9e7d3;
  --text-muted: rgba(255, 255, 255, 0.9);
  --white: #ffffff;

  --btn-bg: #5b0f1b;
  --btn-hover: #731826;

  --shadow-soft: 0 10px 30px rgba(91, 29, 38, 0.08);
  --shadow-medium: 0 20px 40px rgba(91, 29, 38, 0.12);
  --error-red: #d32f2f;
  --success-green: #15803d;

  --transition-fast: 0.2s ease;
  --transition-normal: 0.3s ease;

  --sidebar-bg-1: #6b1f2b;
  --sidebar-bg-2: #7a2530;
  --sidebar-text: #fff3c4;
  --sidebar-logo-filter: brightness(0) invert(1);
}

*{box-sizing:border-box}
body{font-family:Inter, Arial, sans-serif;background:var(--cream-bg);color:var(--text-dark);padding:18px}
.form-card{background:var(--card-bg);border:1px solid var(--border-soft);box-shadow:var(--shadow-soft);padding:18px;border-radius:8px;max-width:980px;margin:0 auto}
.form-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.form-title{background:var(--primary-light);color:var(--text-dark);padding:8px 14px;border-radius:6px;font-weight:700}
.meta{display:flex;gap:12px}
.meta label{font-size:13px;color:var(--text-muted-dark)}
.meta input{display:block;padding:6px 8px;border:1px solid var(--border-soft);background:var(--input-bg);border-radius:4px}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.scoring-table{width:100%;border-collapse:collapse}
.scoring-table th,.scoring-table td{border:1px solid var(--border-soft);padding:10px;text-align:left}
.scoring-table th{background:var(--primary-mid);color:var(--white);font-weight:700}
.bad{background:#fef0f0;color:var(--error-red);font-weight:700;text-align:center}
.amber{background:#fff7e0;color:#a36100;text-align:center}
.good{background:#e5f7ed;color:var(--success-green);text-align:center}
.choice-cell{text-align:center}
.small-list{font-size:13px;color:var(--text-muted-dark)}
.controls{margin-top:14px;display:flex;gap:8px;justify-content:flex-end}
.btn{background:var(--btn-bg);color:var(--white);padding:8px 12px;border-radius:6px;border:none;cursor:pointer}
.btn:hover{background:var(--btn-hover)}
@media print{.controls{display:none}}
        </style>
      </head>
      <body>
        <div class="form-card">
          <div class="form-header">
            <div class="form-title">Call Monitor Form</div>
            <div class="meta">
              <div>
                <label>Row</label>
                <div><strong>${row.srNo}</strong></div>
              </div>
            </div>
          </div>

          <div class="two-col">
            <div>
              <label>CRE Name:</label>
              <input id="creName" value="${escapeHtml(row.creRealName || '')}" />
            </div>
            <div>
              <label>Login ID:</label>
              <input id="loginId" value="${escapeHtml(row.creLoginId || '')}" />
            </div>
            <div>
              <label>Date Of Monitoring:</label>
              <input id="dom" type="date" value="${row.dateOfMonitoring || ''}" />
            </div>
            <div>
              <label>Client Number:</label>
              <input id="clientNumber" value="${escapeHtml(row.clientPhone || '')}" />
            </div>
          </div>

          <table class="scoring-table" id="scoring">
            <thead>
              <tr>
                <th>Parameter</th>
                <th style="width:80px">Scores</th>
                <th>Must Do (tick)</th>
                <th>Should not Do (tick)</th>
                <th style="width:40px">R</th>
                <th style="width:40px">A</th>
                <th style="width:40px">G</th>
                <th style="width:40px">NA</th>
              </tr>
            </thead>
            <tbody id="tbody">
            </tbody>
          </table>

          <div class="controls">
            <button class="btn" onclick="window.print()">Print</button>
            <button class="btn" id="saveBtn">Save (Close)</button>
          </div>
        </div>

        <script>
          const templates = ${templates}
          const row = ${rowData}

          function createRow(p){
            const tr = document.createElement('tr')
            // Parameter / must list cell
            const tdParam = document.createElement('td')
            const strong = document.createElement('strong')
            strong.textContent = p.label
            tdParam.appendChild(strong)
            const small = document.createElement('div')
            small.className = 'small-list'
            small.textContent = p.mustDo.join(' • ')
            tdParam.appendChild(small)
            tr.appendChild(tdParam)

            // score cell
            const tdScore = document.createElement('td')
            tdScore.className = 'choice-cell'
            tdScore.textContent = p.score
            tr.appendChild(tdScore)

            // must-do checkboxes
            const tdMust = document.createElement('td')
            p.mustDo.forEach((m,i)=>{
              const label = document.createElement('label')
              label.style.display = 'block'
              label.style.fontSize = '13px'
              const cb = document.createElement('input')
              cb.type = 'checkbox'
              cb.setAttribute('data-param', p.key)
              cb.setAttribute('data-list', 'must')
              cb.setAttribute('data-idx', i)
              label.appendChild(cb)
              label.appendChild(document.createTextNode(' ' + m))
              tdMust.appendChild(label)
            })
            tr.appendChild(tdMust)

            // should-not checkboxes
            const tdShould = document.createElement('td')
            p.shouldNot.forEach((s,i)=>{
              const label = document.createElement('label')
              label.style.display = 'block'
              label.style.fontSize = '13px'
              const cb = document.createElement('input')
              cb.type = 'checkbox'
              cb.setAttribute('data-param', p.key)
              cb.setAttribute('data-list', 'shouldNot')
              cb.setAttribute('data-idx', i)
              label.appendChild(cb)
              label.appendChild(document.createTextNode(' ' + s))
              tdShould.appendChild(label)
            })
            tr.appendChild(tdShould)

            // radio choices R/A/G/NA
            const choices = ['R','A','G','NA']
            choices.forEach((c)=>{
              const td = document.createElement('td')
              td.className = 'choice-cell'
              const r = document.createElement('input')
              r.type = 'radio'
              r.name = p.key
              r.value = c
              if(c==='NA') r.checked = true
              td.appendChild(r)
              tr.appendChild(td)
            })

            return tr
          }

          const tbody = document.getElementById('tbody')
          templates.forEach((p)=> tbody.appendChild(createRow(p)))

          // restore selections from row.parameterSelections if present
          if(row.parameterSelections){
            templates.forEach((p)=>{
              const sel = row.parameterSelections[p.key]
              if(!sel) return
              // checkboxes
              (sel.must||[]).forEach((v,i)=>{
                const cb = document.querySelector('input[data-param="' + p.key + '"][data-list="must"][data-idx="' + i + '"]')
                if(cb) cb.checked = !!v
              })
              (sel.shouldNot||[]).forEach((v,i)=>{
                const cb = document.querySelector('input[data-param="' + p.key + '"][data-list="shouldNot"][data-idx="' + i + '"]')
                if(cb) cb.checked = !!v
              })
              // choice
              if(sel.choice){
                const r = document.querySelector('input[name="' + p.key + '"][value="' + sel.choice + '"]')
                if(r) r.checked = true
              }
            })
          }

          document.getElementById('saveBtn').addEventListener('click', async ()=>{
            // collect basic form data and selections
            const out = {creName: document.getElementById('creName').value, loginId: document.getElementById('loginId').value, dom: document.getElementById('dom').value, clientNumber: document.getElementById('clientNumber').value, parameters: {}}
            templates.forEach((p)=>{
              const sel = { must: [], shouldNot: [], choice: 'NA' }
              (p.mustDo||[]).forEach((m,i)=>{
                const cb = document.querySelector('input[data-param="' + p.key + '"][data-list="must"][data-idx="' + i + '"]')
                sel.must.push(!!(cb && cb.checked))
              })
              (p.shouldNot||[]).forEach((s,i)=>{
                const cb = document.querySelector('input[data-param="' + p.key + '"][data-list="shouldNot"][data-idx="' + i + '"]')
                sel.shouldNot.push(!!(cb && cb.checked))
              })
              const r = document.querySelector('input[name="' + p.key + '"]:checked')
              if(r) sel.choice = r.value
              out.parameters[p.key] = sel
            })

            // compute totals on client before send
            const totalScorable = templates.reduce((s,p)=> s + Number(p.score||0), 0)
            const totalScored = templates.reduce((sum,p)=>{
              const sel = out.parameters[p.key]
              const choice = sel ? sel.choice : 'NA'
              const mapped = (p.mapping && p.mapping[choice]) ? p.mapping[choice] : 0
              return sum + Number(mapped)
            },0)
            const quality_percent = totalScorable > 0 ? Math.round((totalScored/totalScorable)*10000)/100 : 0

            const payload = { data: out, total_scorable: totalScorable, total_scored: totalScored, quality_percent }

            try{
              // include Authorization token from opener if available
              const headers = {'Content-Type':'application/json'}
              try{
                const parentToken = window.opener && window.opener.MONITOR_API_TOKEN ? window.opener.MONITOR_API_TOKEN : null
                if(parentToken) headers['Authorization'] = 'Token ' + parentToken
              }catch(e){ /* ignore */ }

              const resp = await fetch('http://localhost:8000/api/monitorings/',{method:'POST',headers:headers,body:JSON.stringify(payload)})
              if(resp.ok){
                // optionally notify opener
                if(window.opener && window.opener.postMessage) window.opener.postMessage({saved:true}, '*')
                window.close()
              } else {
                alert('Save failed: ' + resp.status)
              }
            }catch(err){
              alert('Save error: ' + err.message + '. Make sure Django is running on http://localhost:8000')
            }
          })

          // small helper to escape HTML in template above
        </script>
      </body>
      </html>
    `

    // helper available here, but must be included in template string too; ensure values sanitized
    function escapeHtml (str) {
      return (''+str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    }

    // write out the html
    w.document.open()
    w.document.write(html)
    w.document.close()
  }

  return (
    <div className="call-monitor-root">
      <div className="cm-top-actions">
        <h2 className="cm-title">Call Monitor</h2>
        <button className="btn-open-top" onClick={() => rows.length && openFormWindow(rows[0])}>Open Form (Row 1)</button>
      </div>
      <div className="cm-container">
        <div className="cm-table-wrap">
        <table className="cm-table">
          <thead>
            <tr className="header-row">
              <th>Sr.No</th>
              <th>CRE Real Name</th>
              <th>CRE Login ID</th>
              <th>Supervisor</th>
              <th>Manager</th>
              <th>Location</th>
              <th>Tenure Slab</th>
              <th>Batch</th>
              <th>Process</th>
              <th>Monitoring Person</th>
              <th>Client Phone Number</th>
              <th>Project Type</th>
              <th>Service Type</th>
              <th>Client Name</th>
              <th>Date Of Monitoring</th>
              <th>Call Date</th>
              <th>Duration-Minute</th>
              <th>Duration-Second</th>
              <th>Opening & Closing</th>
              <th>Listening & Probing</th>
              <th>Politeness & Courtesy</th>
              <th>Rude (FATAL)</th>
              <th>Communication Scorable</th>
              <th>Communication Scored</th>
              <th>Product Knowledge Scorable</th>
              <th>Product Knowledge Scored</th>
              <th>Tagging Scorable</th>
              <th>Tagging Scored</th>
              <th>Scoring</th>
              <th>Total Scorable</th>
              <th>Total Scored</th>
              <th>Total Quality %</th>
            </tr>
          </thead>
          <tbody>
            {computedRows.map((row) => (
              <tr key={row.id} className="data-row">
                <td className="cell-center">{row.srNo}</td>
                <td>
                  <input
                    value={row.creRealName}
                    onChange={(e) => updateCell(row.id, 'creRealName', e.target.value)}
                    className="cm-input"
                    placeholder="Name"
                  />
                </td>
                <td>
                  <input
                    value={row.creLoginId}
                    onChange={(e) => updateCell(row.id, 'creLoginId', e.target.value)}
                    className="cm-input"
                  />
                </td>
                <td>
                  <input
                    value={row.supervisor}
                    onChange={(e) => updateCell(row.id, 'supervisor', e.target.value)}
                    className="cm-input"
                  />
                </td>
                <td>
                  <input
                    value={row.manager}
                    onChange={(e) => updateCell(row.id, 'manager', e.target.value)}
                    className="cm-input"
                  />
                </td>
                <td>
                  <input
                    value={row.location}
                    onChange={(e) => updateCell(row.id, 'location', e.target.value)}
                    className="cm-input"
                    placeholder="CMC - CBE"
                  />
                </td>
                <td>
                  <select value={row.tenure} onChange={(e) => updateCell(row.id, 'tenure', e.target.value)}>
                    <option value="">Select</option>
                    <option>0 to 1 Month</option>
                    <option>1 to 2 Months</option>
                    <option>2 to 3 Months</option>
                  </select>
                </td>
                <td>
                  <input value={row.batch} onChange={(e) => updateCell(row.id, 'batch', e.target.value)} />
                </td>
                <td>
                  <input value={row.process} onChange={(e) => updateCell(row.id, 'process', e.target.value)} />
                </td>
                <td>
                  <input value={row.monitoringPerson} onChange={(e) => updateCell(row.id, 'monitoringPerson', e.target.value)} />
                </td>
                <td>
                  <input value={row.clientPhone} onChange={(e) => updateCell(row.id, 'clientPhone', e.target.value)} />
                </td>
                <td>
                  <select value={row.projectType} onChange={(e) => updateCell(row.id, 'projectType', e.target.value)}>
                    <option value="">Select</option>
                    <option>Project A</option>
                    <option>Project B</option>
                  </select>
                </td>
                <td>
                  <select value={row.serviceType} onChange={(e) => updateCell(row.id, 'serviceType', e.target.value)}>
                    <option value="">Select</option>
                    <option>Outbound</option>
                    <option>International</option>
                  </select>
                </td>
                <td>
                  <input value={row.clientName} onChange={(e) => updateCell(row.id, 'clientName', e.target.value)} />
                </td>
                <td>
                  <input type="date" value={row.dateOfMonitoring} onChange={(e) => updateCell(row.id, 'dateOfMonitoring', e.target.value)} />
                </td>
                <td>
                  <input type="date" value={row.callDate} onChange={(e) => updateCell(row.id, 'callDate', e.target.value)} />
                </td>
                <td>
                  <input type="number" min="0" value={row.durationMinute} onChange={(e) => updateCell(row.id, 'durationMinute', e.target.value)} />
                </td>
                <td>
                  <input type="number" min="0" value={row.durationSecond} onChange={(e) => updateCell(row.id, 'durationSecond', e.target.value)} />
                </td>
                <td>
                  <select value={row.openingClosing} onChange={(e) => updateCell(row.id, 'openingClosing', e.target.value)}>
                    <option value="">-</option>
                    <option>GREEN</option>
                    <option>AMBER</option>
                    <option>RED</option>
                  </select>
                </td>
                <td>
                  <select value={row.listeningProbing} onChange={(e) => updateCell(row.id, 'listeningProbing', e.target.value)}>
                    <option value="">-</option>
                    <option>GREEN</option>
                    <option>AMBER</option>
                    <option>RED</option>
                  </select>
                </td>
                <td>
                  <select value={row.politeness} onChange={(e) => updateCell(row.id, 'politeness', e.target.value)}>
                    <option value="">-</option>
                    <option>GREEN</option>
                    <option>AMBER</option>
                    <option>RED</option>
                  </select>
                </td>
                <td>
                  <select value={row.rude} onChange={(e) => updateCell(row.id, 'rude', e.target.value)}>
                    <option>NO</option>
                    <option>YES</option>
                  </select>
                </td>
                <td className="cell-center">{row.communicationScorable}</td>
                <td>
                  <input type="number" value={row.communicationScored} onChange={(e) => updateCell(row.id, 'communicationScored', Number(e.target.value) || 0)} />
                </td>
                <td className="cell-center">{row.productKnowledgeScorable}</td>
                <td>
                  <input type="number" value={row.productKnowledgeScored} onChange={(e) => updateCell(row.id, 'productKnowledgeScored', Number(e.target.value) || 0)} />
                </td>
                <td className="cell-center">{row.taggingScorable}</td>
                <td>
                  <input type="number" value={row.taggingScored} onChange={(e) => updateCell(row.id, 'taggingScored', Number(e.target.value) || 0)} />
                </td>
                <td className="cell-center">
                  <button className="btn-score" onClick={() => toggleScoring(row.id)}>{scoringRowId === row.id ? 'Close' : 'Scoring'}</button>
                </td>
                <td className="cell-center">
                  <button className="btn-open" onClick={() => openFormWindow(row)}>Open Form</button>
                </td>
                <td className="cell-center">{row.totalScorable}</td>
                <td className="cell-center">{row.totalScored}</td>
                <td className="cell-center">{row.qualityPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {scoringRowId && (
        <div className="scoring-panel">
          <h3>Scoring Matrix (Row {scoringRowId})</h3>
          <div className="scoring-table">
            <div className="scoring-header">
              <div>Parameter</div>
              <div>Scores</div>
              <div>Must Do</div>
              <div>Should not Do</div>
              <div>R</div>
              <div>A</div>
              <div>G</div>
              <div>NA</div>
            </div>
            {PARAM_TEMPLATES.map((p) => {
              const row = rows.find((r) => r.id === scoringRowId)
              const sel = row && row.parameterSelections ? row.parameterSelections[p.key] : { choice: 'NA', must: [], shouldNot: [] }
              return (
                <div className="scoring-row" key={p.key}>
                  <div className="param-label">{p.label}</div>
                  <div className="param-score">{p.score}</div>
                  <div className="param-must">
                    {p.mustDo.map((m, i) => (
                      <label key={i} className="small-check">
                        <input type="checkbox" checked={sel.must && sel.must[i]} onChange={(e) => updateParameterCheckbox(scoringRowId, p.key, 'must', i, e.target.checked)} /> {m}
                      </label>
                    ))}
                  </div>
                  <div className="param-should">
                    {p.shouldNot.map((s, i) => (
                      <label key={i} className="small-check">
                        <input type="checkbox" checked={sel.shouldNot && sel.shouldNot[i]} onChange={(e) => updateParameterCheckbox(scoringRowId, p.key, 'shouldNot', i, e.target.checked)} /> {s}
                      </label>
                    ))}
                  </div>
                  <div className="param-choice"><input type="radio" name={`${p.key}-${scoringRowId}`} checked={sel.choice === 'R'} onChange={() => updateParameterChoice(scoringRowId, p.key, 'R')} /></div>
                  <div className="param-choice"><input type="radio" name={`${p.key}-${scoringRowId}`} checked={sel.choice === 'A'} onChange={() => updateParameterChoice(scoringRowId, p.key, 'A')} /></div>
                  <div className="param-choice"><input type="radio" name={`${p.key}-${scoringRowId}`} checked={sel.choice === 'G'} onChange={() => updateParameterChoice(scoringRowId, p.key, 'G')} /></div>
                  <div className="param-choice"><input type="radio" name={`${p.key}-${scoringRowId}`} checked={sel.choice === 'NA'} onChange={() => updateParameterChoice(scoringRowId, p.key, 'NA')} /></div>
                </div>
              )
            })}
            <div className="scoring-summary">
              <strong>Total Scorable: </strong> {PARAM_TEMPLATES.reduce((s, p) => s + p.score, 0)}
              &nbsp; <strong>Total Scored: </strong> {rows.find((r) => r.id === scoringRowId)?.totalScored ?? 0}
              &nbsp; <strong>Quality %: </strong> {rows.find((r) => r.id === scoringRowId)?.qualityPercent ?? '0.00'}%
            </div>
          </div>
        </div>
      )}
      <div className="cm-actions">
        <button onClick={addRow} className="btn-add">Add Row</button>
      </div>
    </div>
  )
}
