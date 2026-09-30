/** OMP Ask panel structure: tab chips, question, separate option descriptions,
 * and a stable bottom panel. Tsukuyomi still answers one Pi select at a time. */

export function askPanelModel({ width, height, questions = [], index = 0, options = [], selected = 0, answers = [] }) {
	const columns = Math.max(24, Math.floor(Number(width) || 80));
	const rows = Math.max(10, Math.floor(Number(height) || 24));
	const boxWidth = columns;
	const list = Array.isArray(questions) && questions.length ? questions : [{ header: "Question", question: "" }];
	const current = Math.max(0, Math.min(list.length - 1, Math.floor(Number(index) || 0)));
	const choices = Array.isArray(options) ? options : [];
	const questionRows = Math.min(3, Math.max(1, Math.ceil(String(list[current]?.question || "").length / Math.max(1, boxWidth - 6))));
	const selectedOption = choices[Math.max(0, Math.min(Math.max(0, choices.length - 1), Math.floor(Number(selected) || 0)))];
	const descriptionRows = selectedOption?.description ? 1 : 0;
	const contentHeight = 7 + questionRows + choices.length + descriptionRows;
	const boxHeight = Math.max(10, Math.min(rows - 1, contentHeight));

	return {
		title: "Ask",
		boxWidth,
		boxHeight,
		top: Math.max(0, rows - boxHeight),
		left: 0,
		tabs: list.map((question, tab) => ({
			label: String(question.header || `Q${tab + 1}`).slice(0, 12),
			active: tab === current,
			done: tab < current || Boolean(answers[tab]),
		})),
		question: String(list[current]?.question || ""),
		options: choices.map((option, optionIndex) => ({
			label: String(option.label || option),
			description: option.description ? String(option.description) : "",
			recommended: Boolean(option.recommended),
			selected: optionIndex === selected,
			value: option.value,
		})),
		selected: Math.max(0, Math.min(Math.max(0, choices.length - 1), Math.floor(Number(selected) || 0))),
		help: "↑↓ move · Enter select · Esc cancel · answered tabs stay visible",
	};
}
