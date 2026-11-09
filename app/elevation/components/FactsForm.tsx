import type { ManualFacts } from "../types";

interface FactsFormProps {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  manual: ManualFacts;
  onFieldChange: (key: keyof ManualFacts, value: string) => void;
}

export function FactsForm({ apiKey, onApiKeyChange, manual, onFieldChange }: FactsFormProps) {
  const bind = (key: keyof ManualFacts) => ({
    value: manual[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onFieldChange(key, e.target.value),
  });

  return (
    <div className="el-form-grid">
      <div className="el-field full">
        <label className="el-field-label">Gemini API key</label>
        <input
          className="el-input"
          type="password"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Paste your Gemini API key"
          autoComplete="off"
        />
      </div>
      <div className="el-field">
        <label className="el-field-label">Name</label>
        <input className="el-input" {...bind("name")} placeholder="e.g. Golden Gate Bridge" />
      </div>
      <div className="el-field">
        <label className="el-field-label">Year built</label>
        <input className="el-input" {...bind("year")} placeholder="e.g. 1937" inputMode="numeric" />
      </div>
      <div className="el-field">
        <label className="el-field-label">Location</label>
        <input className="el-input" {...bind("location")} placeholder="e.g. San Francisco, USA" />
      </div>
      <div className="el-field">
        <label className="el-field-label">Style (optional)</label>
        <input className="el-input" {...bind("style")} placeholder="e.g. Art Deco" />
      </div>
      <div className="el-field full">
        <label className="el-field-label">Materials (optional, comma-separated)</label>
        <input className="el-input" {...bind("materials")} placeholder="e.g. steel, cable" />
      </div>
      <div className="el-field full">
        <label className="el-field-label">History / background (optional)</label>
        <textarea
          className="el-textarea"
          {...bind("notes")}
          placeholder="Architect, event, significance, anything you know…"
        />
      </div>
    </div>
  );
}
