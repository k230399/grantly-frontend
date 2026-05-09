"use client";
// Client component: manages local UI state (expanded card, type-picker open) and reacts to clicks/typing.

// Controlled component — the parent owns the schema via `value`/`onChange`. Output is saved to the
// `application_form_schema` JSON column. Used on /admin/grant-rounds/new and /admin/grant-rounds/[id]/edit.

import { useState } from "react";
import {
  ListChecks,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Type,
  AlignLeft,
  Hash,
  Calendar,
  CircleDot,
  CheckSquare,
  X,
} from "lucide-react";

// ── Exported schema types — also imported by the new + edit pages ───────────

export type FormFieldType =
  | "short_text"     // single-line text input
  | "long_text"      // textarea
  | "number"
  | "date"
  | "single_choice"  // radio buttons
  | "multi_choice";  // checkboxes

export interface FormFieldOption {
  id: string;     // stable id — used as the value stored in form_data when this option is selected
  label: string;
}

export interface FormField {
  id: string;                   // stable id — used as the property name in form_data
  type: FormFieldType;
  label: string;
  help_text?: string;
  required: boolean;
  options?: FormFieldOption[];  // single_choice and multi_choice only
  min?: number;                 // number type only
  max?: number;                 // number type only
}

// Stored on grant_rounds.application_form_schema as JSON.
export interface ApplicationFormSchema {
  version: 1;            // bump if the schema's shape ever changes
  fields: FormField[];   // order is the order applicants see
}

// Single source of truth for the label + icon — keeps the Add Question menu and the per-card badge in sync.
const TYPE_META: Record<FormFieldType, { label: string; Icon: typeof Type }> = {
  short_text:    { label: "Short text",       Icon: Type },
  long_text:     { label: "Long text",        Icon: AlignLeft },
  number:        { label: "Number",           Icon: Hash },
  date:          { label: "Date",             Icon: Calendar },
  single_choice: { label: "Single choice",    Icon: CircleDot },
  multi_choice:  { label: "Multiple choice",  Icon: CheckSquare },
};

// Stable ids (not array index) so answers in form_data keep mapping correctly through reorders/deletes.
function newId(): string {
  return crypto.randomUUID();
}

// Choice types start with two empty options because a single-option question is meaningless.
function makeField(type: FormFieldType): FormField {
  const base: FormField = {
    id: newId(),
    type,
    label: "",
    required: false,
  };
  if (type === "single_choice" || type === "multi_choice") {
    base.options = [
      { id: newId(), label: "" },
      { id: newId(), label: "" },
    ];
  }
  return base;
}

interface FormSchemaBuilderProps {
  value: ApplicationFormSchema | null;
  onChange: (next: ApplicationFormSchema | null) => void;
}

export default function FormSchemaBuilder({ value, onChange }: FormSchemaBuilderProps) {
  // Only one card open at a time so the page doesn't grow indefinitely.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);

  const fields = value?.fields ?? [];

  // Send null when the list is empty so the API sees no schema rather than an empty-fields object.
  function emit(nextFields: FormField[]) {
    if (nextFields.length === 0) {
      onChange(null);
    } else {
      onChange({ version: 1, fields: nextFields });
    }
  }

  // Auto-expand the new card so the admin can start typing the label immediately.
  function addField(type: FormFieldType) {
    const field = makeField(type);
    emit([...fields, field]);
    setIsTypeMenuOpen(false);
    setExpandedId(field.id);
  }

  function updateFieldById(id: string, updater: (f: FormField) => FormField) {
    emit(fields.map((f) => (f.id === id ? updater(f) : f)));
  }

  function removeField(id: string) {
    emit(fields.filter((f) => f.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  // direction = -1 moves up, +1 moves down. Out-of-range moves are no-ops so the end buttons stay enabled.
  function moveField(id: string, direction: -1 | 1) {
    const i = fields.findIndex((f) => f.id === id);
    const j = i + direction;
    if (i === -1 || j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j], next[i]];
    emit(next);
  }

  return (
    // No overflow-hidden here on purpose — it would clip the absolutely-positioned Add Question dropdown.
    <div className="bg-white rounded-xl border border-gray-200">

      {/* ── Section header ────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900">Application Form</h2>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">
          Define the custom questions applicants will answer. Leave blank to only collect the project details above.
        </p>
      </div>

      <div className="p-6">
        {/* Empty state */}
        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-10 px-6 text-center">
            <ListChecks className="w-7 h-7 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">No custom questions yet</p>
            <p className="text-xs text-gray-500 max-w-md">
              Applicants will only fill in the project details above. Add a question to ask for more information.
            </p>
          </div>
        ) : (
          /* <ul>/<li> so screen readers announce this as a list of questions. */
          <ul className="space-y-3">
            {fields.map((field, index) => {
              const isExpanded = expandedId === field.id;
              const meta = TYPE_META[field.type];
              const TypeIcon = meta.Icon;

              return (
                <li
                  key={field.id}
                  className="rounded-lg border border-gray-200 bg-white"
                >
                  {/* Card header row — always visible */}
                  <div className="flex items-center gap-3 px-4 py-3">

                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-medium text-gray-500 flex-shrink-0">
                      {index + 1}
                    </span>

                    {/* Stretched to fill the row so most of the card is clickable. */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : field.id)}
                      className="flex-1 flex items-center gap-2.5 text-left min-w-0"
                    >
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 flex-shrink-0">
                        <TypeIcon className="w-3 h-3" />
                        {meta.label}
                      </span>

                      <span className={`text-sm truncate ${field.label ? "text-gray-900 font-medium" : "text-gray-400 italic"}`}>
                        {field.label || "Untitled question"}
                      </span>

                      {field.required && (
                        <span className="text-xs text-red-500 flex-shrink-0">required</span>
                      )}

                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
                      )}
                    </button>

                    {/* Reorder + delete */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => moveField(field.id, -1)}
                        disabled={index === 0}
                        className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Move question up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveField(field.id, 1)}
                        disabled={index === fields.length - 1}
                        className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Move question down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded card body */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 border-t border-gray-100 bg-gray-50/50 space-y-4">

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Question <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) =>
                            updateFieldById(field.id, (f) => ({ ...f, label: e.target.value }))
                          }
                          placeholder="e.g. Describe your project goals"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Help Text
                          <span className="text-xs font-normal text-gray-400 ml-2">Optional — shown below the question</span>
                        </label>
                        <input
                          type="text"
                          value={field.help_text ?? ""}
                          onChange={(e) =>
                            // Empty string maps to undefined so we don't persist empty strings in JSON.
                            updateFieldById(field.id, (f) => ({ ...f, help_text: e.target.value || undefined }))
                          }
                          placeholder="e.g. Be specific about who will benefit"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      {/* Number-only min/max */}
                      {field.type === "number" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Minimum</label>
                            <input
                              type="number"
                              value={field.min ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                // Empty string → undefined so we never save min: NaN.
                                updateFieldById(field.id, (f) => ({
                                  ...f,
                                  min: raw === "" ? undefined : Number(raw),
                                }));
                              }}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Maximum</label>
                            <input
                              type="number"
                              value={field.max ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                updateFieldById(field.id, (f) => ({
                                  ...f,
                                  max: raw === "" ? undefined : Number(raw),
                                }));
                              }}
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                        </div>
                      )}

                      {/* Options sub-builder — for single_choice and multi_choice */}
                      {(field.type === "single_choice" || field.type === "multi_choice") && (
                        <OptionsEditor
                          options={field.options ?? []}
                          onChange={(opts) =>
                            updateFieldById(field.id, (f) => ({ ...f, options: opts }))
                          }
                        />
                      )}

                      {/* Required toggle */}
                      <div className="flex items-center justify-between gap-4 pt-1">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Required</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Applicant must answer before they can submit.
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={field.required}
                          onClick={() =>
                            updateFieldById(field.id, (f) => ({ ...f, required: !f.required }))
                          }
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            field.required ? "bg-blue-600" : "bg-gray-200"
                          }`}
                        >
                          <span className="sr-only">Required</span>
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                              field.required ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* ── Add Question button + type-picker dropdown ─────────────── */}
        <div className="mt-4 relative">
          <button
            type="button"
            onClick={() => setIsTypeMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>

          {/* Only rendered when open so we don't keep stale handlers mounted. */}
          {isTypeMenuOpen && (
            <>
              {/* Click-outside backdrop — z-10 sits above the form, the menu (z-20) sits above the backdrop. */}
              <button
                type="button"
                onClick={() => setIsTypeMenuOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close menu"
              />
              <div className="absolute left-0 mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-md z-20 p-1">
                {(Object.keys(TYPE_META) as FormFieldType[]).map((type) => {
                  const meta = TYPE_META[type];
                  const Icon = meta.Icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addField(type)}
                      className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Icon className="w-4 h-4 text-gray-400" />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-component for editing options on a single_choice/multi_choice question — kept separate for readability.
interface OptionsEditorProps {
  options: FormFieldOption[];
  onChange: (next: FormFieldOption[]) => void;
}

function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  function updateOption(id: string, label: string) {
    onChange(options.map((o) => (o.id === id ? { ...o, label } : o)));
  }

  function removeOption(id: string) {
    onChange(options.filter((o) => o.id !== id));
  }

  function addOption() {
    onChange([...options, { id: crypto.randomUUID(), label: "" }]);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Options <span className="text-red-500">*</span>
      </label>

      <div className="space-y-2">
        {options.map((option, idx) => (
          <div key={option.id} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-5 flex-shrink-0">{idx + 1}.</span>
            <input
              type="text"
              value={option.label}
              onChange={(e) => updateOption(option.id, e.target.value)}
              placeholder={`Option ${idx + 1}`}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="button"
              onClick={() => removeOption(option.id)}
              // Keep at least one option so the question always has something to choose from.
              disabled={options.length <= 1}
              className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Remove option"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addOption}
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add option
      </button>
    </div>
  );
}
