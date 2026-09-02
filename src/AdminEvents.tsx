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
import { products } from "./data";
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
        banner: uploadedBanner || null,
      };
      if (editing) await updateEvent(editing.id, payload);
      else await createEvent(payload);
      setOpen(false);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (event: ManagedEvent) => {
    if (!window.confirm(`Are you sure you want to delete "${event.title}"? All associated files, gallery media, and links will also be removed. This cannot be undone.`))
      return;
    try {
      setBusy(true);
      await deleteEvent(event.id);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setBusy(false);
    }
  };

  if (checkingAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center text-[13px] text-[var(--ink-45)]">
        Checking access…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="font-display text-[16px] font-bold text-[var(--ink)] mb-1.5">
            Admin access required
          </div>
          <div className="text-[13px] text-[var(--ink-45)] leading-relaxed">
            Your account isn't marked as an admin. Ask an existing admin to
            grant you access if you believe this is a mistake.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 self-stretch w-full overflow-y-auto">
      <div className="px-8 py-6 max-w-[1400px]">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-[22px] font-bold text-[var(--ink)] tracking-tight">
              Events Management
            </h1>
            <p className="text-[13px] text-[var(--ink-45)] mt-1">
              Create and manage corporate events across Sheshi product suites.
            </p>
          </div>
          <button
            onClick={startAdd}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-[12px] font-semibold hover:bg-[var(--primary-hover)]"
          >
            + Create Event
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 text-red-700 text-[12px]">
            ⚠️ {error}
          </div>
        )}

        <div className="bg-white border border-[var(--line-soft)] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[var(--canvas)] border-b border-[var(--line-soft)] text-[11px] text-[var(--ink-45)] uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => {
                  const product = products.find(
                    (p) => p.id === event.product_id || p.slug === event.product_id,
                  );
                  const status = calculateEventStatus(event);
                  const startDateStr = new Date(event.event_date).toLocaleDateString(
                    undefined,
                    { year: "numeric", month: "short", day: "numeric" }
                  );
                  const endDateStr = event.end_date ? new Date(event.end_date).toLocaleDateString(
                    undefined,
                    { year: "numeric", month: "short", day: "numeric" }
                  ) : null;

                  return (
                    <tr
                      key={event.id}
                      className="border-b border-[var(--line-soft)] last:border-0 text-[12.5px]"
                    >
                      <td className="px-4 py-3 font-semibold text-[var(--ink)]">
                        {event.title}
                      </td>
                      <td className="px-4 py-3 text-[var(--ink-70)]">
                        {product?.name || "Sheshi"}
                      </td>
                      <td className="px-4 py-3 text-[var(--ink-70)]">
                        {startDateStr}{endDateStr ? ` - ${endDateStr}` : ''}
                      </td>
                      <td className="px-4 py-3 text-[var(--ink-70)]">
                        {event.location || "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--ink-70)]">
                        {event.event_type}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            status === "ongoing"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : status === "upcoming"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => startEdit(event)}
                          className="text-[var(--primary)] font-semibold mr-3 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => remove(event)}
                          className="text-red-600 font-semibold disabled:opacity-40 hover:underline"
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
            <div className="py-12 text-center text-[13px] text-[var(--ink-45)]">
              No events yet. Click "+ Create Event" above to create your first event.
            </div>
          )}
        </div>

        {open && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="font-display text-[18px] font-bold">
                    {editing ? "Edit Event Details" : "Create New Event"}
                  </h2>
                  <p className="text-[12px] text-[var(--ink-45)] mt-1">
                    Fill in event information and associated product suite.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-[var(--ink-45)] text-xl hover:text-[var(--ink)]"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="sm:col-span-2 text-[12px] font-medium">
                  Event Name *
                  <input
                    {...register("title")}
                    placeholder="e.g. India FinTech Summit 2026"
                    className={`mt-1.5 w-full px-3 py-2 rounded-lg border outline-none ${errors.title ? "border-red-500" : "border-[var(--line-soft)]"}`}
                  />
                  {errors.title && (
                    <span className="block text-[11px] text-red-600 mt-1">
                      ⚠️ {errors.title.message}
                    </span>
                  )}
                </label>

                <label className="text-[12px] font-medium">
                  Associated Product *
                  <select
                    {...register("product_id")}
                    className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[var(--line-soft)] bg-white"
                  >
                    <option value="sheshi">Sheshi</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-[12px] font-medium">
                  Event Format *
                  <select
                    {...register("event_type")}
                    className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[var(--line-soft)] bg-white"
                  >
                    <option value="In-person">In-person</option>
                    <option value="Virtual">Virtual</option>
                  </select>
                </label>

                <label className="text-[12px] font-medium">
                  Start Date *
                  <input
                    type="date"
                    {...register("event_date")}
                    className={`mt-1.5 w-full px-3 py-2 rounded-lg border outline-none ${errors.event_date ? "border-red-500" : "border-[var(--line-soft)]"}`}
                  />
                  {errors.event_date && (
                    <span className="block text-[11px] text-red-600 mt-1">
                      ⚠️ {errors.event_date.message}
                    </span>
                  )}
                </label>

                <label className="text-[12px] font-medium">
                  End Date (Optional)
                  <input
                    type="date"
                    {...register("end_date")}
                    className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[var(--line-soft)] outline-none"
                  />
                </label>

                <label className="sm:col-span-2 text-[12px] font-medium">
                  Location
                  <input
                    {...register("location")}
                    placeholder="e.g. Convention Centre, Mumbai"
                    className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[var(--line-soft)]"
                  />
                </label>

                <label className="sm:col-span-2 text-[12px] font-medium">
                  Event Cover / Banner Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                    className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[var(--line-soft)]"
                  />
                  <span className="block text-[10px] text-[var(--ink-45)] mt-1">
                    {bannerFile
                      ? bannerFile.name
                      : editing?.banner
                        ? "Current cover banner will be kept unless replaced."
                        : "Upload cover banner image."}
                  </span>
                </label>

                <label className="sm:col-span-2 text-[12px] font-medium">
                  Description
                  <textarea
                    {...register("description")}
                    rows={3}
                    placeholder="Provide event details, objectives, agenda..."
                    className="mt-1.5 w-full px-3 py-2 rounded-lg border border-[var(--line-soft)]"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-[12px] font-semibold border border-[var(--line-soft)] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  disabled={busy}
                  className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-[12px] font-semibold disabled:opacity-50 hover:bg-[var(--primary-hover)]"
                >
                  {busy ? "Saving…" : "Save Event"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
