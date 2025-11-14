import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

app = Flask(__name__)
CORS(app)
model_name = "gemini-2.5-flash-preview-09-2025"
# --- Gemini API Configuration ---
try:
    # This is a placeholder key. Replace with your actual key in a secure way.
    api_key = os.getenv("GEMINI_API_KEY", "YOUR_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY":
        print("WARNING: Gemini API key is not set. Using placeholder logic.")
        # TODO: Add your gemini API key here for actual use. Free tier will be enough for testing.
        api_key = None

    else:
        genai.configure(api_key=api_key)
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    api_key = None


# --- This is the core instruction for the AI model ---
SYSTEM_PROMPT = """
You are NADIA, an expert in diagram generation. Your task is to analyze user-provided text and determine the most suitable diagram type from the following options: 'stateChart', 'logicCircuit', 'flowchart', '3ap'.

- **State Chart Keywords**: state, transitions, goes to, leads to, cycles, starts, ends, initial, final.
- **Logic Circuit Keywords**: and, or, not, nand, nor, xor, gate, input, output, switch, led, connects to.
- **Flowchart Keywords**: process, step, decision, if/then, start, end, procedure, flow.
- **Mind Map Keywords**: main idea, central topic, branches, concepts, brainstorm, related ideas.

Based on the detected type, you MUST extract the nodes and their relationships and respond with a JSON object following the exact schema for that type.

**1. State Chart Schema:**
{
  "type": "stateChart",
  "nodes": [ { "key": "UniqueNodeName", "text": "Display Name", "type": "Start" | "End" | "Normal" } ],
  "links": [ { "from": "SourceNodeKey", "to": "TargetNodeKey", "text": "transition label" } ]
}

**2. Logic Circuit Schema:**
{
  "type": "logicCircuit",
  "nodes": [ { "key": "UniqueNodeName", "category": "input" | "output" | "switch" | "and" | "or" | "not" ..., "text": "Display Name" } ],
  "links": [ { "from": "SourceNodeKey", "to": "TargetNodeKey", "fromPort": "portId", "toPort": "portId" } ]
}

**3. Flowchart Schema:**
{
  "type": "flowchart",
  "nodes": [ { "key": "UniqueNodeName", "text": "Display Name", "category": "Start" | "End" | "Conditional" | "Step" } ],
  "links": [ { "from": "SourceNodeKey", "to": "TargetNodeKey", "text": "yes/no/label" } ]
}

**4. Mind Map Schema (IMPORTANT: Uses TreeModel):**
{
  "class": "go.TreeModel",
  "nodeDataArray": [
    { "key": 0, "text": "Central Idea", "brush": "#007acc" },
    { "key": 1, "parent": 0, "text": "Branch 1", "brush": "skyblue", "dir": "right" },
    { "key": 2, "parent": 1, "text": "Sub-Branch 1.1", "brush": "skyblue", "dir": "right" },
    { "key": 3, "parent": 0, "text": "Branch 2", "brush": "palevioletred", "dir": "left" }
  ]
}

**5. Pie Chart (Model):**
{ "type": "pieChart", "nodeDataArray": [ { "key": 0, "text": "Chart Title", "slices": [ { "text": "Slice 1", "count": 10, "color": "#B378C1" }, { "text": "Slice 2", "count": 20, "color": "#F25F5C" } ] } ] }
- For Pie Charts, extract the title and the list of slices with their text and count. Assign a unique color to each slice.


- The root node has no "parent" property and should have a distinct "brush" color (e.g., "#007acc").
- All other nodes MUST have a "parent" property referencing the key of their parent node.
- Assign "dir" (direction) as either "right" or "left" for branches from the root. Sub-branches should inherit the direction of their parent branch.
- Assign a "brush" color for each main branch from the root. Sub-branches inherit the color. Use colors like "skyblue", "darkseagreen", "palevioletred", "coral".

**CRITICAL RULES:**
- Respond ONLY with the JSON object. No introductory text, explanations, or markdown.
- Ensure all 'key' properties in the 'nodes' or 'nodeDataArray' are unique.
- For TreeModel, ensure 'parent' keys exist.
- For other types, ensure 'from' and 'to' keys exist.
"""


REGENERATE_TEXT_PROMPT = """
You are a diagram description assistant. You will be given an original text description and a JSON object representing the current state of a diagram that was modified by a user.
Your task is to update the original text to accurately describe the diagram's current state as represented by the JSON, presenting it as a single, coherent paragraph.

1.  **Analyze the Diagram JSON**: Understand the nodes, their properties, and the links connecting them.
2.  **Compare with Original Text**: Identify what has changed (nodes added/removed, links added/removed, text changed).
3.  **Rewrite the Text**: Update the original text to reflect these changes. Maintain the original writing style and merge all information into one paragraph.
4.  **Highlight Changes**: Crucially, you MUST wrap all new or modified parts of the description in **markdown bold** and make it in blue color (e.g., "**this is a new part**"). Do not bold or change color of the entire text, only the specific changes.
5.  **Return Only Text**: Your response must only contain the final, updated paragraph. Do not include any other commentary or markdown formatting besides the bolding for changes.
6.  **Be consistent**: Ensure that the updated text is logically consistent and 100% reflects the current state of the diagram as per the JSON provided. 
"""


@app.route("/generate-diagram", methods=["POST"])
def generate_diagram():
    try:
        user_text = request.json["text"]

        if not api_key:
            # --- This is placeholder logic for demonstration if API key is not set. ---
            lower_text = user_text.lower()
            schema = {}
            if "pie chart" in lower_text or "poll" in lower_text:
                schema = {
                    "type": "pieChart",
                    "nodeDataArray": [
                        {
                            "key": 0,
                            "text": "Sample Poll",
                            "slices": [
                                {"text": "Option 1", "count": 21, "color": "#B378C1"},
                                {"text": "Option 2", "count": 11, "color": "#F25F5C"},
                            ],
                        }
                    ],
                }
            elif "mind map" in lower_text:
                schema = {
                    "class": "go.TreeModel",
                    "nodeDataArray": [
                        {"key": 0, "text": "Mind Map", "brush": "#007acc"},
                        {
                            "key": 1,
                            "parent": 0,
                            "text": "Branch 1",
                            "brush": "skyblue",
                            "dir": "right",
                        },
                        {
                            "key": 2,
                            "parent": 0,
                            "text": "Branch 2",
                            "brush": "palevioletred",
                            "dir": "left",
                        },
                    ],
                }
            elif any(keyword in lower_text for keyword in ["state", "transition"]):
                nodes = [
                    {"key": "Start", "text": "Start", "type": "Start"},
                    {"key": "State 1", "text": "State 1"},
                    {"key": "End", "text": "End", "type": "End"},
                ]
                links = [
                    {"from": "Start", "to": "State 1"},
                    {"from": "State 1", "to": "End"},
                ]
                schema = {"type": "stateChart", "nodes": nodes, "links": links}
            elif any(keyword in lower_text for keyword in ["gate", "input", "output"]):
                nodes = [
                    {
                        "key": "Input A",
                        "category": "input",
                        "text": "Input A",
                        "isOn": True,
                    },
                    {
                        "key": "Input B",
                        "category": "input",
                        "text": "Input B",
                        "isOn": False,
                    },
                    {"key": "AND1", "category": "and", "text": "AND"},
                    {"key": "Output Q", "category": "output", "text": "Q"},
                ]
                links = [
                    {"from": "Input A", "to": "AND1", "toPort": "in1"},
                    {"from": "Input B", "to": "AND1", "toPort": "in2"},
                    {"from": "AND1", "to": "Output Q"},
                ]
                schema = {"type": "logicCircuit", "nodes": nodes, "links": links}
            else:
                return (
                    jsonify(
                        {
                            "error": "Could not determine diagram type with placeholder logic."
                        }
                    ),
                    400,
                )
            return jsonify(schema)
            # --- End of Placeholder Logic ---

        model = genai.GenerativeModel(
            model_name=model_name, system_instruction=SYSTEM_PROMPT
        )
        response = model.generate_content(user_text)
        clean_response = response.text.strip().replace("```json", "").replace("```", "")
        schema = json.loads(clean_response)

        return jsonify(schema)

    except Exception as e:
        print(f"An error occurred in /generate-diagram: {e}")
        return jsonify({"error": "Failed to generate diagram."}), 500


@app.route("/regenerate-text", methods=["POST"])
def regenerate_text():
    try:
        data = request.json
        original_text = data["original_text"]
        diagram_json_str = data["diagram_json"]

        if not api_key:
            # --- Placeholder logic if API key is not set ---
            updated_text = f"{original_text}\n\n**A change was detected in the diagram (Note: API key not configured).**"
            return jsonify({"updated_text": updated_text})
            # --- End of Placeholder Logic ---

        model = genai.GenerativeModel(
            model_name=model_name, system_instruction=REGENERATE_TEXT_PROMPT
        )
        prompt = f"Original Text:\n{original_text}\n\nDiagram JSON:\n{diagram_json_str}"
        response = model.generate_content(prompt)
        updated_text = response.text.strip()
        return jsonify({"updated_text": updated_text})

    except Exception as e:
        print(f"An error occurred in /regenerate-text: {e}")
        return jsonify({"error": "Failed to regenerate text."}), 500


if __name__ == "__main__":
    # run app with most of logging enabled and verbosity
    app.run(debug=True)
