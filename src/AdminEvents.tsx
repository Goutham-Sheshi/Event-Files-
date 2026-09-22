import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  calculateEventStatus,
  createEvent,
  deleteEvent,
  getEvents,
  isCurrentUserAdmin,
  updateEvent,
  uploadEventBanner,
  type EventInput,
  type ManagedEvent,
} from "./eventsApi";
import {
  createEventNotification,
} from "./notificationsApi";
import { products } from "./data";
import { getErrorMessage } from "./resourcesApi";
import { eventSchema, type EventFormData } from "./schemas/eventSchemas";

const defaultEventDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
};

function toDateInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AdminEvents({ onChanged }: { onChanged?: () => void }) {
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [editing, setEditing] = useState<ManagedEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: yupResolver(eventSchema),
    defaultValues: {
      title: "",
      description: "",
      event_date: defaultEventDate(),
      end_date: "",
      location: "",
      product_id: null,
      event_type: "In-person",
    },
    mode: "onTouched",
  });

  useEffect(() => {
    isCurrentUserAdmin().then((result) => {
      setIsAdmin(result);
      setCheckingAdmin(false);
    });
  }, []);

  const load = async () => {
    try {
      setEvents(await getEvents());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events");
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const startAdd = () => {
    setEditing(null);
    reset({
      title: "",
      description: "",
      event_date: defaultEventDate(),
      end_date: "",
      location: "",
      product_id: null,
      event_type: "In-person",
    });
    setBannerFile(null);
    setError("");
    setOpen(true);
  };

  const startEdit = (event: ManagedEvent) => {
    setEditing(event);
    setValue("title", event.title);
    setValue("description", event.description || "");
    setValue("event_date", toDateInput(event.event_date));
    setValue("end_date", toDateInput(event.end_date));
    setValue("location", event.location || "");
    setValue("product_id", event.product_id);
    setValue("event_type", event.event_type as "In-person" | "Virtual");
    setBannerFile(null);
    setError("");
    setOpen(true);
  };

  const onSubmit = async (data: EventFormData) => {
    setBusy(true);
    setError("");
    try {
      const existingBanner = editing?.banner_path || editing?.banner || null;
      const uploadedBanner = bannerFile
        ? await uploadEventBanner(bannerFile)
        : existingBanner;
      const payload: EventInput = {
        title: data.title,
        description: data.description || null,
        event_date: new Date(`${data.event_date}T12:00:00`).toISOString(),
        end_date: data.end_date ? new Date(`${data.end_date}T23:59:59`).toISOString() : null,
        location: data.location || null,
        product_id: data.product_id || null,
        event_type: data.event_type as "In-person" | "Virtual",
        banner_path: uploadedBanner,
      };

      if (editing) {
        await updateEvent(editing.id, payload);
      } else {
        const newEvt = await createEvent(payload);
        try {
          await createEventNotification({
            event_id: newEvt.id,
            title: `New Event: ${newEvt.title}`,
            message: `${newEvt.title} has been scheduled for ${new Date(newEvt.event_date).toLocaleDateString()}. Check out resources and agenda in Sheshi Vault!`,
          });
        } catch (notifErr) {
          console.warn("Automated notification creation warning:", notifErr);
        }
      }

      setOpen(false);
      reset();
      setBannerFile(null);
      await load();
      onChanged?.();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (event: ManagedEvent) => {
    if (!window.confirm(`Are you sure you want to delete "${event.title}"?`)) return;
    setBusy(true);
    try {
      await deleteEvent(event.id);
      await load();
      onChanged?.();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (checkingAdmin) {
    return (
      <div className="p-8 text-center text-sm font-mono text-[var(--ink-45)]">
        Checking administrative privileges…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-sm text-[var(--ink-45)]">
        Administrator access required to manage events.
      </div>
    );
  }

  return (
    <div className="flex-1 self-stretch w-full overflow-y-auto bg-[var(--canvas)]">
      <div className="px-8 py-8 max-w-[1400px] mx-auto space-y-6">
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
          <div>
            <div className="badge-pill mb-1">
              <span className="pulse-dot bg-orange-500" />
              EVENT OPERATIONS
            </div>
            <h1 className="font-display text-[24px] font-extrabold tracking-tight heading-gradient">
              Corporate Events & Summits
            </h1>
            <p className="text-[13px] text-[var(--ink-45)] mt-0.5">
              Create, curate, and orchestrate events across all Sheshi product lines.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={startAdd}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[12.5px] font-semibold transition-all shadow-md shadow-orange-500/20 cursor-pointer flex items-center gap-2"
            >
              <span>+</span>
              <span>Create New Event</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-[12px] flex items-center gap-2 font-mono">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Modern 21st.dev Events Table */}
        <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl overflow-hidden backdrop-blur-md shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[var(--surface-2)] border-b border-[var(--border)] text-[11px] text-[var(--ink-45)] uppercase font-mono tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Event Name</th>
                  <th className="px-5 py-3.5">Product Suite</th>
                  <th className="px-5 py-3.5">Date Schedule</th>
                  <th className="px-5 py-3.5">Location</th>
                  <th className="px-5 py-3.5">Format</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {events.map((event) => {
                  const product = products.find(
                    (p) => p.id === event.product_id || p.slug === event.product_id,
                  );
                  const status = calculateEventStatus(event);
                  const startDateStr = new Date(event.event_date).toLocaleDateString(
                    undefined,
                    { year: "numeric", month: "short", day: "numeric" }
                  );
                  const endDateStr = event.end_date
                    ? new Date(event.end_date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : null;

                  return (
                    <tr
                      key={event.id}
                      className="hover:bg-[var(--surface-2)] transition-colors text-[12.5px]"
                    >
                      <td className="px-5 py-4 font-semibold text-[var(--ink)]">
                        {event.title}
                      </td>
                      <td className="px-5 py-4">
                        {product ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border"
                            style={{
                              background: `${product.color}15`,
                              borderColor: `${product.color}35`,
                              color: product.color,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: product.color }} />
                            {product.name}
                          </span>
                        ) : (
                          <span className="badge-pill text-[10px]">Sheshi</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-[11.5px] text-[var(--ink-70)]">
                        {startDateStr}
                        {endDateStr ? ` — ${endDateStr}` : ''}
                      </td>
                      <td className="px-5 py-4 text-[var(--ink-70)]">
                        {event.location || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="badge-pill text-[10px]">{event.event_type}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            status === "ongoing"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : status === "upcoming"
                              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                              : "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                          }`}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: status === "ongoing" ? "#10b981" : status === "upcoming" ? "#3b82f6" : "#94a3b8",
                            }}
                          />
                          {status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => startEdit(event)}
                          className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-semibold mr-3 cursor-pointer text-xs"
                        >
                          Edit
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => remove(event)}
                          className="text-red-400 hover:text-red-300 font-semibold disabled:opacity-40 cursor-pointer text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {events.length === 0 && (
            <div className="py-16 text-center text-[13px] text-[var(--ink-45)]">
              No events scheduled yet. Click "+ Create New Event" above to publish your first summit.
            </div>
          )}
        </div>

        {/* 21st.dev Create / Edit Modal Dialog */}
        {open && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="w-full max-w-xl bg-[var(--paper)] border border-[var(--border)] rounded-3xl shadow-2xl p-7 max-h-[90vh] overflow-y-auto space-y-4"
            >
              <div className="flex justify-between items-start pb-2 border-b border-[var(--border)]">
                <div>
                  <h2 className="font-display text-[18px] font-bold text-[var(--ink)]">
                    {editing ? "Edit Event Parameters" : "Create New Corporate Event"}
                  </h2>
                  <p className="text-[12px] text-[var(--ink-45)] mt-0.5">
                    Configure dates, associated product suite, and cover banner.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-[var(--ink-45)] text-xl hover:text-[var(--ink)] cursor-pointer"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label className="sm:col-span-2 text-[12px] font-semibold text-[var(--ink-70)]">
                  Event Name *
                  <input
                    {...register("title")}
                    placeholder="e.g. India FinTech Summit 2026"
                    className={`mt-1.5 w-full px-3.5 py-2.5 rounded-xl border bg-[var(--surface)] text-[var(--ink)] text-xs outline-none ${
                      errors.title ? "border-red-500" : "border-[var(--border)] focus:border-[var(--primary)]"
                    }`}
                  />
                  {errors.title && (
                    <span className="block text-[11px] text-red-400 mt-1 font-mono">
                      ⚠️ {errors.title.message}
                    </span>
                  )}
                </label>

                <label className="text-[12px] font-semibold text-[var(--ink-70)]">
                  Associated Product *
                  <select
                    {...register("product_id")}
                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs outline-none"
                  >
                    <option value="sheshi">Sheshi Central</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-[12px] font-semibold text-[var(--ink-70)]">
                  Event Format *
                  <select
                    {...register("event_type")}
                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs outline-none"
                  >
                    <option value="In-person">In-person</option>
                    <option value="Virtual">Virtual</option>
                  </select>
                </label>

                <label className="text-[12px] font-semibold text-[var(--ink-70)]">
                  Start Date *
                  <input
                    type="date"
                    {...register("event_date")}
                    className={`mt-1.5 w-full px-3.5 py-2.5 rounded-xl border bg-[var(--surface)] text-[var(--ink)] text-xs outline-none ${
                      errors.event_date ? "border-red-500" : "border-[var(--border)] focus:border-[var(--primary)]"
                    }`}
                  />
                  {errors.event_date && (
                    <span className="block text-[11px] text-red-400 mt-1 font-mono">
                      ⚠️ {errors.event_date.message}
                    </span>
                  )}
                </label>

                <label className="text-[12px] font-semibold text-[var(--ink-70)]">
                  End Date (Optional)
                  <input
                    type="date"
                    {...register("end_date")}
                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs outline-none"
                  />
                </label>

                <label className="sm:col-span-2 text-[12px] font-semibold text-[var(--ink-70)]">
                  Location / Venue
                  <input
                    {...register("location")}
                    placeholder="e.g. Jio World Convention Centre, Mumbai"
                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs outline-none"
                  />
                </label>

                <label className="sm:col-span-2 text-[12px] font-semibold text-[var(--ink-70)]">
                  Event Cover / Banner Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs"
                  />
                  <span className="block text-[10.5px] text-[var(--ink-45)] mt-1 font-mono">
                    {bannerFile
                      ? bannerFile.name
                      : editing?.banner
                      ? "Existing cover banner will be retained unless replaced."
                      : "Recommended resolution: 1200x600px."}
                  </span>
                </label>

                <label className="sm:col-span-2 text-[12px] font-semibold text-[var(--ink-70)]">
                  Description & Agenda
                  <textarea
                    {...register("description")}
                    rows={3}
                    placeholder="Provide event objectives, guest speakers, schedule..."
                    className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] text-xs outline-none resize-y"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-[12px] font-semibold border border-[var(--border)] rounded-xl text-[var(--ink-70)] hover:bg-[var(--surface)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={busy}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[12px] font-semibold shadow-md shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {busy ? "Saving…" : "Save & Publish"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
