import React, { useEffect, useRef, useState } from 'react'
import { getEventNotes, saveEventNotes, type EventNotesData } from '../eventsApi'

interface EventNotesEditorProps {
  eventId: string
  canEdit: boolean
}

export default function EventNotesEditor({ eventId, canEdit }: EventNotesEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [lastMeta, setLastMeta] = useState<string>('')
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const defaultPlaceholder = `<h1>Meeting Notes & Briefing</h1><p>Click anywhere to start writing notes for this event. Type <strong>/</strong> to insert headings, tables, callout boxes, or checklists.</p><blockquote>Keep all core preparation notes, agenda items, and vendor contacts organized here.</blockquote>`

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
    const calloutHtml = `<div style="background: rgba(99, 102, 241, 0.08); border-left: 4px solid #6366f1; padding: 14px; border-radius: 8px; margin: 12px 0;"><strong>💡 Note:</strong> Enter important details here...</div><p><br></p>`
    exec('insertHTML', calloutHtml)
  }

  const insertQuote = () => {
    if (!canEdit) return
    const quoteHtml = `<blockquote style="border-left: 3px solid #f97316; padding-left: 14px; font-style: italic; color: var(--ink-70); margin: 12px 0;">"Enter important quote or highlight..."</blockquote><p><br></p>`
    exec('insertHTML', quoteHtml)
  }

  const insertCodeBlock = () => {
    if (!canEdit) return
    const codeHtml = `<pre style="background: #0f172a; color: #f8fafc; padding: 14px; border-radius: 10px; font-family: monospace; font-size: 13px; margin: 12px 0;">// Add code snippet or API payload here</pre><p><br></p>`
    exec('insertHTML', codeHtml)
  }

  const insertTaskList = () => {
    if (!canEdit) return
    const taskHtml = `<div style="display: flex; items-center; gap: 8px; margin: 6px 0;"><input type="checkbox" style="width: 16px; height: 16px; accent-color: var(--primary);" /> <span>Task item...</span></div>`
    exec('insertHTML', taskHtml)
  }

  const insertTable = () => {
    if (!canEdit) return
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid var(--line-soft);">
        <thead>
          <tr style="background: var(--canvas-deep);">
            <th style="border: 1px solid var(--line-soft); padding: 10px; text-align: left; font-weight: 600;">Header 1</th>
            <th style="border: 1px solid var(--line-soft); padding: 10px; text-align: left; font-weight: 600;">Header 2</th>
            <th style="border: 1px solid var(--line-soft); padding: 10px; text-align: left; font-weight: 600;">Header 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid var(--line-soft); padding: 10px;">Item A1</td>
            <td style="border: 1px solid var(--line-soft); padding: 10px;">Item B1</td>
            <td style="border: 1px solid var(--line-soft); padding: 10px;">Item C1</td>
          </tr>
          <tr>
            <td style="border: 1px solid var(--line-soft); padding: 10px;">Item A2</td>
            <td style="border: 1px solid var(--line-soft); padding: 10px;">Item B2</td>
            <td style="border: 1px solid var(--line-soft); padding: 10px;">Item C2</td>
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
    <div className="bg-white border border-[var(--line-soft)] rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
      {/* Notion Editor Header Bar */}
      <div className="px-6 py-3.5 bg-slate-50 border-b border-[var(--line-soft)] flex flex-wrap items-center justify-between gap-3">
        {/* Formatting Toolbar */}
        {canEdit ? (
          <div className="flex items-center gap-1 flex-wrap text-xs">
            {/* Block Types */}
            <select
              onChange={e => applyFormatBlock(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--line-soft)] bg-white text-xs font-semibold text-[var(--ink)] outline-none cursor-pointer"
            >
              <option value="p">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            {/* Inline Styles */}
            <button onClick={applyBold} className="w-8 h-8 rounded-lg hover:bg-slate-200 font-bold text-slate-800 flex items-center justify-center" title="Bold (Ctrl+B)">B</button>
            <button onClick={applyItalic} className="w-8 h-8 rounded-lg hover:bg-slate-200 italic font-semibold text-slate-800 flex items-center justify-center" title="Italic (Ctrl+I)">I</button>
            <button onClick={applyUnderline} className="w-8 h-8 rounded-lg hover:bg-slate-200 underline font-semibold text-slate-800 flex items-center justify-center" title="Underline (Ctrl+U)">U</button>
            <button onClick={applyStrike} className="w-8 h-8 rounded-lg hover:bg-slate-200 line-through font-semibold text-slate-800 flex items-center justify-center" title="Strikethrough">S</button>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            {/* Lists */}
            <button onClick={applyBulletList} className="px-2 py-1.5 rounded-lg hover:bg-slate-200 font-semibold text-slate-700" title="Bullet List">• List</button>
            <button onClick={applyNumberedList} className="px-2 py-1.5 rounded-lg hover:bg-slate-200 font-semibold text-slate-700" title="Numbered List">1. List</button>
            <button onClick={insertTaskList} className="px-2 py-1.5 rounded-lg hover:bg-slate-200 font-semibold text-slate-700" title="Task / Checkbox List">☑ Task</button>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            {/* Special Notion Blocks */}
            <button onClick={insertTable} className="px-2.5 py-1.5 rounded-lg hover:bg-slate-200 font-semibold text-slate-700 flex items-center gap-1" title="Insert Table">
              <span>📊</span> Table
            </button>
            <button onClick={insertCallout} className="px-2.5 py-1.5 rounded-lg hover:bg-slate-200 font-semibold text-indigo-600 flex items-center gap-1" title="Insert Callout Box">
              <span>💡</span> Callout
            </button>
            <button onClick={insertQuote} className="px-2.5 py-1.5 rounded-lg hover:bg-slate-200 font-semibold text-orange-600 flex items-center gap-1" title="Insert Quote">
              <span>💬</span> Quote
            </button>
            <button onClick={insertCodeBlock} className="px-2.5 py-1.5 rounded-lg hover:bg-slate-200 font-mono font-semibold text-slate-800" title="Code Block">&lt;/&gt;</button>
            <button onClick={insertLink} className="px-2.5 py-1.5 rounded-lg hover:bg-slate-200 font-semibold text-slate-700" title="Insert Hyperlink">🔗 Link</button>
            <button onClick={insertHorizontalRule} className="px-2.5 py-1.5 rounded-lg hover:bg-slate-200 font-semibold text-slate-700" title="Horizontal Divider">— Line</button>

            {/* Colors */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="px-2.5 py-1.5 rounded-lg hover:bg-slate-200 font-semibold text-slate-800 flex items-center gap-1"
                title="Text Colors & Highlights"
              >
                🎨 Color
              </button>

              {showColorPicker && (
                <div className="absolute top-10 left-0 z-50 bg-white border border-[var(--line-soft)] shadow-xl rounded-xl p-3 w-56 space-y-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Text Color</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        { color: '#0f172a', name: 'Dark' },
                        { color: '#f97316', name: 'Orange' },
                        { color: '#6366f1', name: 'Indigo' },
                        { color: '#10b981', name: 'Green' },
                        { color: '#ef4444', name: 'Red' },
                        { color: '#a855f7', name: 'Purple' },
                      ].map(c => (
                        <button
                          key={c.color}
                          onClick={() => { applyForeColor(c.color); setShowColorPicker(false) }}
                          className="w-6 h-6 rounded-full border border-slate-200"
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
                        { color: '#fef08a', name: 'Yellow' },
                        { color: '#bae6fd', name: 'Blue' },
                        { color: '#bbf7d0', name: 'Green' },
                        { color: '#fbcfe8', name: 'Pink' },
                        { color: '#e9d5ff', name: 'Purple' },
                      ].map(c => (
                        <button
                          key={c.color}
                          onClick={() => { applyHiliteColor(c.color); setShowColorPicker(false) }}
                          className="w-6 h-6 rounded-md border border-slate-300"
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
          <div className="text-xs font-semibold text-slate-500">Read-Only Notes View</div>
        )}

        {/* Save Status & Metadata Badge */}
        <div className="flex items-center gap-3 text-xs font-medium ml-auto">
          {lastMeta && <span className="text-slate-400 hidden sm:inline">{lastMeta}</span>}
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
            saveStatus === 'saved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            saveStatus === 'saving' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-slate-100 text-slate-600'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              saveStatus === 'saved' ? 'bg-emerald-500' :
              saveStatus === 'saving' ? 'bg-amber-500 animate-ping' :
              'bg-slate-400'
            }`} />
            {saveStatus === 'saved' ? 'Saved to Event Hub' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes'}
          </span>

          {canEdit && (
            <button
              onClick={triggerSave}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:bg-[var(--primary-hover)] transition-all"
            >
              Save Notes
            </button>
          )}
        </div>
      </div>

      {/* Slash Block Menu Popup */}
      {showSlashMenu && canEdit && (
        <div className="mx-8 mt-2 p-2 bg-white border border-[var(--line-soft)] rounded-xl shadow-xl z-40 max-w-sm space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">Insert Block</div>
          <button onClick={() => { applyFormatBlock('h1'); setShowSlashMenu(false) }} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-100 rounded-lg flex items-center gap-2">H1 Heading 1</button>
          <button onClick={() => { applyFormatBlock('h2'); setShowSlashMenu(false) }} className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-100 rounded-lg flex items-center gap-2">H2 Heading 2</button>
          <button onClick={() => { insertTable(); setShowSlashMenu(false) }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-100 rounded-lg flex items-center gap-2">📊 Data Table</button>
          <button onClick={() => { insertCallout(); setShowSlashMenu(false) }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-100 rounded-lg flex items-center gap-2 text-indigo-600">💡 Callout Box</button>
          <button onClick={() => { insertQuote(); setShowSlashMenu(false) }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-100 rounded-lg flex items-center gap-2 text-orange-600">💬 Quote Block</button>
          <button onClick={() => { insertTaskList(); setShowSlashMenu(false) }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-100 rounded-lg flex items-center gap-2">☑ Checklist Item</button>
        </div>
      )}

      {/* Notion ContentEditable Canvas */}
      <div className="flex-1 p-8 sm:p-12 overflow-y-auto">
        <div
          ref={editorRef}
          contentEditable={canEdit}
          onInput={handleEditorInput}
          onKeyDown={handleKeyDown}
          className="min-h-[450px] outline-none text-slate-800 text-sm leading-relaxed max-w-4xl mx-auto prose prose-slate focus:outline-none"
          style={{ minHeight: '450px' }}
        />
      </div>
    </div>
  )
}
