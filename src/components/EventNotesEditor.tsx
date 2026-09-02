import React, { useEffect, useRef, useState } from 'react'
import { getEventNotes, saveEventNotes } from '../eventsApi'

interface EventNotesEditorProps {
  eventId: string
  canEdit: boolean
}

function BoldIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
}
function ItalicIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
}
function UnderlineIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
}
function StrikeIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 0 1-6-7c0-4.42 4.03-8 9-8a9 9 0 0 1 8 5"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
}
function ListIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
}
function TaskIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
}
function TableIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
}
function CalloutIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
}
function QuoteIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3c0 4-2 6-4 6z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h3c0 4-2 6-4 6z"/></svg>
}
function CodeIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
}
function LinkIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
}
function LineIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
}
function PaletteIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.5-.72 1.5-1.5 0-.4-.15-.78-.42-1.07-.27-.29-.42-.67-.42-1.07 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9z"/></svg>
}

export default function EventNotesEditor({ eventId, canEdit }: EventNotesEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [lastMeta, setLastMeta] = useState<string>('')
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const defaultPlaceholder = `<h1 style="font-size: 26px; font-weight: 700; color: #f8fafc; margin-bottom: 12px;">Meeting Notes & Event Briefing</h1><p style="color: #cbd5e1; margin-bottom: 16px;">Click anywhere on this canvas to start writing notes. Use the formatting bar above or type <span style="background: rgba(255,255,255,0.15); color: #f97316; padding: 2px 6px; border-radius: 4px; font-family: monospace;">/</span> to insert headings, tables, callout boxes, or checklists.</p><div style="background: rgba(99, 102, 241, 0.12); border-left: 4px solid #6366f1; padding: 14px 16px; border-radius: 8px; margin: 16px 0; color: #e2e8f0;"><strong style="color: #818cf8;">💡 Event Focus:</strong> Keep all core preparation notes, agenda items, speaker contacts, and venue schedules organized here.</div>`

  // Load Initial Notes
  useEffect(() => {
    let isMounted = true
    getEventNotes(eventId).then(data => {
      if (!isMounted) return
      if (editorRef.current) {
        editorRef.current.innerHTML = data.content?.trim() ? data.content : defaultPlaceholder
      }
      if (data.updatedBy && data.updatedAt) {
        const timeStr = new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setLastMeta(`Last edited by ${data.updatedBy} at ${timeStr}`)
      } else {
        setLastMeta('')
      }
    })
    return () => { isMounted = false }
  }, [eventId])

  // Trigger Save
  const triggerSave = async () => {
    if (!editorRef.current || !canEdit) return
    setSaveStatus('saving')
    setSaving(true)
    const content = editorRef.current.innerHTML
    try {
      const res = await saveEventNotes(eventId, content)
      setSaveStatus('saved')
      if (res.updatedBy && res.updatedAt) {
        const timeStr = new Date(res.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setLastMeta(`Last edited by ${res.updatedBy} at ${timeStr}`)
      }
    } catch {
      setSaveStatus('unsaved')
    } finally {
      setSaving(false)
    }
  }

  // Handle Input Changes with Debounced Auto-save
  const handleEditorInput = () => {
    setSaveStatus('unsaved')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      triggerSave()
    }, 1200)
  }

  // ExecCommand helper
  const exec = (command: string, value: string = '') => {
    if (!canEdit) return
    document.execCommand(command, false, value)
    if (editorRef.current) editorRef.current.focus()
    handleEditorInput()
  }

  // Formatting Actions
  const applyFormatBlock = (tag: string) => exec('formatBlock', `<${tag}>`)
  const applyBold = () => exec('bold')
  const applyItalic = () => exec('italic')
  const applyUnderline = () => exec('underline')
  const applyStrike = () => exec('strikeThrough')
  const applyBulletList = () => exec('insertUnorderedList')
  const applyNumberedList = () => exec('insertOrderedList')
  const applyForeColor = (color: string) => exec('foreColor', color)
  const applyHiliteColor = (color: string) => exec('hiliteColor', color)

  // Custom Block Inserters
  const insertCallout = () => {
    if (!canEdit) return
    const calloutHtml = `<div style="background: rgba(99, 102, 241, 0.14); border-left: 4px solid #6366f1; padding: 14px 16px; border-radius: 8px; margin: 16px 0; color: #e2e8f0;"><strong style="color: #818cf8;">💡 Callout:</strong> Enter important briefing note...</div><p><br></p>`
    exec('insertHTML', calloutHtml)
  }

  const insertQuote = () => {
    if (!canEdit) return
    const quoteHtml = `<blockquote style="border-left: 4px solid #f97316; padding-left: 14px; font-style: italic; color: #fdba74; margin: 16px 0; background: rgba(249, 115, 22, 0.08); padding-top: 8px; padding-bottom: 8px; border-radius: 0 8px 8px 0;">"Enter important quote or highlight..."</blockquote><p><br></p>`
    exec('insertHTML', quoteHtml)
  }

  const insertCodeBlock = () => {
    if (!canEdit) return
    const codeHtml = `<pre style="background: #090d16; color: #34d399; padding: 16px; border-radius: 10px; font-family: monospace; font-size: 13px; margin: 16px 0; border: 1px solid rgba(255,255,255,0.1);">// Add code snippet, API payload, or JSON configuration here</pre><p><br></p>`
    exec('insertHTML', codeHtml)
  }

  const insertTaskList = () => {
    if (!canEdit) return
    const taskHtml = `<div style="display: flex; align-items: center; gap: 10px; margin: 8px 0; color: #f8fafc;"><input type="checkbox" style="width: 17px; height: 17px; accent-color: #f97316; cursor: pointer;" /> <span>New action item...</span></div>`
    exec('insertHTML', taskHtml)
  }

  const insertTable = () => {
    if (!canEdit) return
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 18px 0; border: 1px solid rgba(255,255,255,0.15); background: rgba(15, 23, 42, 0.6); color: #f8fafc; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: rgba(255,255,255,0.08); text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; color: #94a3b8;">
            <th style="border: 1px solid rgba(255,255,255,0.12); padding: 12px; text-align: left; font-weight: 700;">Task / Deliverable</th>
            <th style="border: 1px solid rgba(255,255,255,0.12); padding: 12px; text-align: left; font-weight: 700;">Owner</th>
            <th style="border: 1px solid rgba(255,255,255,0.12); padding: 12px; text-align: left; font-weight: 700;">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid rgba(255,255,255,0.12); padding: 12px;">Stage Setup & AV Check</td>
            <td style="border: 1px solid rgba(255,255,255,0.12); padding: 12px;">Event Ops Team</td>
            <td style="border: 1px solid rgba(255,255,255,0.12); padding: 12px; color: #34d399; font-weight: 600;">Confirmed</td>
          </tr>
          <tr>
            <td style="border: 1px solid rgba(255,255,255,0.12); padding: 12px;">Executive Briefing Decks</td>
            <td style="border: 1px solid rgba(255,255,255,0.12); padding: 12px;">Marketing Lead</td>
            <td style="border: 1px solid rgba(255,255,255,0.12); padding: 12px; color: #fbbf24; font-weight: 600;">In Progress</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `
    exec('insertHTML', tableHtml)
  }

  const insertLink = () => {
    if (!canEdit) return
    const url = prompt('Enter link URL (e.g. https://sheshi.ai):')
    if (url) {
      exec('createLink', url)
    }
  }

  const insertHorizontalRule = () => {
    if (!canEdit) return
    exec('insertHorizontalRule')
  }

  // Key Down Handler (Slash Command Menu & Keyboard Shortcuts)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      triggerSave()
      return
    }

    if (e.key === '/') {
      setShowSlashMenu(true)
    } else if (e.key === 'Escape') {
      setShowSlashMenu(false)
      setShowColorPicker(false)
    }
  }

  return (
    <div className="bg-[#111622] border border-white/10 rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[650px] text-slate-100">
      {/* Notion Editor Header Bar */}
      <div className="px-5 py-3 bg-[#182030] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        {/* Formatting Toolbar */}
        {canEdit ? (
          <div className="flex items-center gap-1 flex-wrap text-xs">
            {/* Block Types */}
            <select
              onChange={e => applyFormatBlock(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-white/15 bg-[#0f172a] text-xs font-semibold text-slate-200 outline-none cursor-pointer hover:border-white/30"
            >
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>

            <div className="h-4 w-px bg-white/15 mx-1" />

            {/* Inline Styles */}
            <button onClick={applyBold} className="w-8 h-8 rounded-lg hover:bg-white/10 text-white font-bold flex items-center justify-center transition-colors" title="Bold (Ctrl+B)"><BoldIcon /></button>
            <button onClick={applyItalic} className="w-8 h-8 rounded-lg hover:bg-white/10 text-white font-semibold flex items-center justify-center transition-colors" title="Italic (Ctrl+I)"><ItalicIcon /></button>
            <button onClick={applyUnderline} className="w-8 h-8 rounded-lg hover:bg-white/10 text-white font-semibold flex items-center justify-center transition-colors" title="Underline (Ctrl+U)"><UnderlineIcon /></button>
            <button onClick={applyStrike} className="w-8 h-8 rounded-lg hover:bg-white/10 text-white font-semibold flex items-center justify-center transition-colors" title="Strikethrough"><StrikeIcon /></button>

            <div className="h-4 w-px bg-white/15 mx-1" />

            {/* Lists */}
            <button onClick={applyBulletList} className="px-2.5 py-1.5 rounded-lg hover:bg-white/10 font-semibold text-slate-200 flex items-center gap-1.5 transition-colors" title="Bullet List"><ListIcon /> List</button>
            <button onClick={insertTaskList} className="px-2.5 py-1.5 rounded-lg hover:bg-white/10 font-semibold text-slate-200 flex items-center gap-1.5 transition-colors" title="Task / Checkbox List"><TaskIcon /> Task</button>

            <div className="h-4 w-px bg-white/15 mx-1" />

            {/* Special Notion Blocks */}
            <button onClick={insertTable} className="px-2.5 py-1.5 rounded-lg hover:bg-white/10 font-semibold text-slate-200 flex items-center gap-1.5 transition-colors" title="Insert Table">
              <TableIcon /> Table
            </button>
            <button onClick={insertCallout} className="px-2.5 py-1.5 rounded-lg hover:bg-indigo-500/20 font-semibold text-indigo-300 flex items-center gap-1.5 transition-colors" title="Insert Callout Box">
              <CalloutIcon /> Callout
            </button>
            <button onClick={insertQuote} className="px-2.5 py-1.5 rounded-lg hover:bg-orange-500/20 font-semibold text-orange-300 flex items-center gap-1.5 transition-colors" title="Insert Quote">
              <QuoteIcon /> Quote
            </button>
            <button onClick={insertCodeBlock} className="px-2.5 py-1.5 rounded-lg hover:bg-white/10 font-mono font-semibold text-emerald-400 flex items-center gap-1.5 transition-colors" title="Code Block"><CodeIcon /> Code</button>
            <button onClick={insertLink} className="px-2.5 py-1.5 rounded-lg hover:bg-white/10 font-semibold text-slate-200 flex items-center gap-1.5 transition-colors" title="Insert Hyperlink"><LinkIcon /> Link</button>
            <button onClick={insertHorizontalRule} className="px-2.5 py-1.5 rounded-lg hover:bg-white/10 font-semibold text-slate-200 flex items-center gap-1.5 transition-colors" title="Horizontal Divider"><LineIcon /> Line</button>

            {/* Colors */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="px-2.5 py-1.5 rounded-lg hover:bg-white/10 font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
                title="Text Colors & Highlights"
              >
                <PaletteIcon /> Color
              </button>

              {showColorPicker && (
                <div className="absolute top-10 left-0 z-50 bg-[#1e293b] border border-white/20 shadow-2xl rounded-xl p-3.5 w-60 space-y-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Text Color</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        { color: '#f8fafc', name: 'White' },
                        { color: '#f97316', name: 'Orange' },
                        { color: '#818cf8', name: 'Indigo' },
                        { color: '#34d399', name: 'Emerald' },
                        { color: '#f87171', name: 'Red' },
                        { color: '#c084fc', name: 'Purple' },
                      ].map(c => (
                        <button
                          key={c.color}
                          onClick={() => { applyForeColor(c.color); setShowColorPicker(false) }}
                          className="w-6 h-6 rounded-full border border-white/20"
                          style={{ background: c.color }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Background Highlight</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        { color: 'transparent', name: 'None' },
                        { color: 'rgba(253, 224, 71, 0.25)', name: 'Yellow' },
                        { color: 'rgba(56, 189, 248, 0.25)', name: 'Blue' },
                        { color: 'rgba(74, 222, 128, 0.25)', name: 'Green' },
                        { color: 'rgba(244, 114, 182, 0.25)', name: 'Pink' },
                        { color: 'rgba(192, 132, 252, 0.25)', name: 'Purple' },
                      ].map(c => (
                        <button
                          key={c.color}
                          onClick={() => { applyHiliteColor(c.color); setShowColorPicker(false) }}
                          className="w-6 h-6 rounded-md border border-white/30"
                          style={{ background: c.color }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-400">Read-Only View</div>
        )}

        {/* Save Status & Metadata Badge */}
        <div className="flex items-center gap-3 text-xs font-medium ml-auto">
          {lastMeta && <span className="text-slate-400 hidden lg:inline">{lastMeta}</span>}
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
            saveStatus === 'saved' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
            saveStatus === 'saving' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
            'bg-slate-700 text-slate-300'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              saveStatus === 'saved' ? 'bg-emerald-400' :
              saveStatus === 'saving' ? 'bg-amber-400 animate-ping' :
              'bg-slate-400'
            }`} />
            {saveStatus === 'saved' ? 'Saved to Event Hub' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes'}
          </span>

          {canEdit && (
            <button
              onClick={triggerSave}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-all shadow-sm"
            >
              Save Notes
            </button>
          )}
        </div>
      </div>

      {/* Slash Block Menu Popup */}
      {showSlashMenu && canEdit && (
        <div className="mx-8 mt-3 p-2 bg-[#1e293b] border border-white/20 rounded-xl shadow-2xl z-40 max-w-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Insert Notion Block</div>
          <button onClick={() => { applyFormatBlock('h1'); setShowSlashMenu(false) }} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-white/10 text-white rounded-lg flex items-center gap-2">H1 Heading 1</button>
          <button onClick={() => { applyFormatBlock('h2'); setShowSlashMenu(false) }} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-white/10 text-white rounded-lg flex items-center gap-2">H2 Heading 2</button>
          <button onClick={() => { insertTable(); setShowSlashMenu(false) }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-white/10 text-white rounded-lg flex items-center gap-2">📊 Data Table</button>
          <button onClick={() => { insertCallout(); setShowSlashMenu(false) }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-indigo-500/20 text-indigo-300 rounded-lg flex items-center gap-2">💡 Callout Box</button>
          <button onClick={() => { insertQuote(); setShowSlashMenu(false) }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-orange-500/20 text-orange-300 rounded-lg flex items-center gap-2">💬 Quote Block</button>
          <button onClick={() => { insertTaskList(); setShowSlashMenu(false) }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-white/10 text-white rounded-lg flex items-center gap-2">☑ Checklist Item</button>
        </div>
      )}

      {/* Notion ContentEditable Canvas Container */}
      <div
        className="flex-1 p-8 sm:p-12 overflow-y-auto cursor-text bg-[#0e131f]"
        onClick={() => editorRef.current?.focus()}
      >
        <div
          ref={editorRef}
          contentEditable={canEdit}
          onInput={handleEditorInput}
          onKeyDown={handleKeyDown}
          className="min-h-[480px] outline-none text-slate-100 text-sm leading-relaxed max-w-4xl mx-auto focus:outline-none"
          style={{ minHeight: '480px' }}
        />
      </div>
    </div>
  )
}
