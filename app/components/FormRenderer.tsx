"use client";
// Client component: manages controlled inputs for the applicant's answers.

import type {
  ApplicationFormSchema,
  FormField,
} from "@/components/admin/FormSchemaBuilder";

// Answers are keyed by field.id (not index) so reordering questions doesn't break stored answers.
// short_text/long_text/date → string · number → number · single_choice → option.id · multi_choice → option.id[]
export type FormDataValue = string | number | string[] | undefined;
export type FormData = Record<string, FormDataValue>;

interface FormRendererProps {
  schema: ApplicationFormSchema;
  value: FormData;
  onChange: (next: FormData) => void;
  readOnly?: boolean;
}

export default function FormRenderer({ schema, value, onChange, readOnly = false }: FormRendererProps) {
  // Empty strings map to undefined so PATCH payloads don't carry empty answers.
  function setAnswer(fieldId: string, next: FormDataValue) {
    const cleaned = next === "" ? undefined : next;
    onChange({ ...value, [fieldId]: cleaned });
  }

  return (
    <div className="space-y-5">
      {schema.fields.map((field) => (
        <FieldRow
          key={field.id}
          field={field}
          answer={value[field.id]}
          onAnswerChange={(next) => setAnswer(field.id, next)}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

interface FieldRowProps {
  field: FormField;
  answer: FormDataValue;
  onAnswerChange: (next: FormDataValue) => void;
  readOnly: boolean;
}

function FieldRow({ field, answer, onAnswerChange, readOnly }: FieldRowProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {field.label || "Untitled question"}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {field.help_text && (
        <p className="text-xs text-gray-500 mb-2">{field.help_text}</p>
      )}

      {readOnly ? (
        <ReadOnlyAnswer field={field} answer={answer} />
      ) : (
        <FieldInput field={field} answer={answer} onAnswerChange={onAnswerChange} />
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

function FieldInput({ field, answer, onAnswerChange }: Omit<FieldRowProps, "readOnly">) {
  switch (field.type) {
    case "short_text":
      return (
        <input
          type="text"
          value={(answer as string) ?? ""}
          onChange={(e) => onAnswerChange(e.target.value)}
          className={inputClass}
        />
      );

    case "long_text":
      return (
        <textarea
          value={(answer as string) ?? ""}
          onChange={(e) => onAnswerChange(e.target.value)}
          rows={4}
          className={inputClass}
        />
      );

    case "number":
      return (
        <input
          type="number"
          value={answer === undefined ? "" : String(answer)}
          min={field.min}
          max={field.max}
          onChange={(e) => {
            const raw = e.target.value;
            onAnswerChange(raw === "" ? undefined : Number(raw));
          }}
          className={inputClass}
        />
      );

    case "date":
      return (
        <input
          type="date"
          value={(answer as string) ?? ""}
          onChange={(e) => onAnswerChange(e.target.value)}
          className={inputClass}
        />
      );

    case "single_choice": {
      const selected = (answer as string) ?? "";
      return (
        <div className="space-y-2">
          {(field.options ?? []).map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="radio"
                name={field.id}
                value={option.id}
                checked={selected === option.id}
                onChange={() => onAnswerChange(option.id)}
                className="text-blue-600 focus:ring-blue-500"
              />
              <span>{option.label || "Untitled option"}</span>
            </label>
          ))}
        </div>
      );
    }

    case "multi_choice": {
      const selected = Array.isArray(answer) ? (answer as string[]) : [];
      return (
        <div className="space-y-2">
          {(field.options ?? []).map((option) => {
            const isChecked = selected.includes(option.id);
            return (
              <label
                key={option.id}
                className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    const next = isChecked
                      ? selected.filter((id) => id !== option.id)
                      : [...selected, option.id];
                    onAnswerChange(next.length === 0 ? undefined : next);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>{option.label || "Untitled option"}</span>
              </label>
            );
          })}
        </div>
      );
    }
  }
}

// Resolves option ids to their visible labels so the read-only view doesn't show UUIDs.
function ReadOnlyAnswer({ field, answer }: { field: FormField; answer: FormDataValue }) {
  const empty = <p className="text-sm text-gray-400 italic">No answer provided</p>;

  if (answer === undefined || answer === "" || (Array.isArray(answer) && answer.length === 0)) {
    return empty;
  }

  if (field.type === "single_choice") {
    const opt = field.options?.find((o) => o.id === answer);
    return <p className="text-sm text-gray-800">{opt?.label ?? "—"}</p>;
  }

  if (field.type === "multi_choice") {
    const ids = Array.isArray(answer) ? answer : [];
    const labels = ids
      .map((id) => field.options?.find((o) => o.id === id)?.label)
      .filter(Boolean);
    return <p className="text-sm text-gray-800">{labels.join(", ")}</p>;
  }

  return <p className="text-sm text-gray-800 whitespace-pre-wrap">{String(answer)}</p>;
}
