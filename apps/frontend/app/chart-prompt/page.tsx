"use client";

import { useState } from "react";
import { chartSpecSchema } from "@/lib/schemas/chart-spec";
import { ChartSpec } from "@/types/chart-types";
import { ChartBlock } from "@/components/blocks/ChartBlock";
import { CheckCircle2, XCircle } from "lucide-react";

export default function ChartPromptPage() {
  const [jsonInput, setJsonInput] = useState("");
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
  }>({ isValid: false });
  const [chartSpec, setChartSpec] = useState<ChartSpec | null>(null);

  const parseObjectLiteral = (input: string) => {
    try {
      // Wrap the input in parentheses to make it a valid expression
      const wrappedInput = `(${input})`;
      // Use Function constructor to safely evaluate the expression
      const result = new Function(`return ${wrappedInput}`)();
      console.log("Parsed object:", JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error("Parse error:", error);
      throw new Error("Invalid object literal format");
    }
  };

  const handleJsonInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;
    setJsonInput(input);

    try {
      const parsedObject = parseObjectLiteral(input);
      console.log("Validating object:", JSON.stringify(parsedObject, null, 2));
      const result = chartSpecSchema.safeParse(parsedObject);
      console.log("Validation result:", result);
      
      if (result.success) {
        console.log("Validation successful");
        setValidationResult({ isValid: true });
      } else {
        console.log("Validation errors:", result.error.errors);
        setValidationResult({
          isValid: false,
          error: result.error.errors.map(err => `${err.path.join(".")}: ${err.message}`).join("\n")
        });
      }
    } catch (error) {
      console.error("Validation error:", error);
      setValidationResult({
        isValid: false,
        error: error instanceof Error ? error.message : "Invalid format"
      });
    }
  };

  const handleSubmit = () => {
    try {
      const parsedObject = parseObjectLiteral(jsonInput);
      console.log("Submitting object:", JSON.stringify(parsedObject, null, 2));
      const result = chartSpecSchema.safeParse(parsedObject);
      console.log("Submit validation result:", result);
      
      if (result.success) {
        console.log("Setting chart spec:", JSON.stringify(result.data, null, 2));
        setChartSpec(result.data);
      } else {
        console.log("Submit validation errors:", result.error.errors);
      }
    } catch (error) {
      console.error("Submit error:", error);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Chart Specification Validator</h1>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="relative">
            <textarea
              className="w-full h-[600px] p-4 border rounded-lg font-mono text-sm"
              value={jsonInput}
              onChange={handleJsonInputChange}
              placeholder="Paste your ChartSpec object here..."
            />
            <div className="absolute top-2 right-2">
              {validationResult.isValid ? (
                <CheckCircle2 className="text-green-500" size={24} />
              ) : (
                <XCircle className="text-red-500" size={24} />
              )}
            </div>
          </div>
          {validationResult.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <pre className="text-red-600 text-sm whitespace-pre-wrap">
                {validationResult.error}
              </pre>
            </div>
          )}
          <button
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            onClick={handleSubmit}
            disabled={!validationResult.isValid}
          >
            Render Chart
          </button>
        </div>
        <div className="border rounded-lg p-4">
          {chartSpec ? (
            <ChartBlock spec={chartSpec} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Chart will appear here after validation
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 