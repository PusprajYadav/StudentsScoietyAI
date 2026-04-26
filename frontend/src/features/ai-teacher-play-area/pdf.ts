import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { PlayAreaDocument, PlayAreaSection } from "./types";
import { buildMindmapDepths, sanitizeFileName } from "./utils";

function appendTextParagraph(parent: HTMLElement, text: string, className?: string) {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  if (className) {
    paragraph.className = className;
  }
  parent.appendChild(paragraph);
  return paragraph;
}

function createSectionNode(section: PlayAreaSection) {
  const sectionNode = document.createElement("section");
  sectionNode.className = "playarea-pdf-section";

  const kicker = document.createElement("p");
  kicker.className = "playarea-pdf-kicker";
  kicker.textContent = section.kicker || section.type.replace(/_/g, " ");
  sectionNode.appendChild(kicker);

  const title = document.createElement("h2");
  title.className = "playarea-pdf-section-title";
  title.textContent = section.title || "Untitled section";
  sectionNode.appendChild(title);

  if (section.type === "paragraph") {
    const note = document.createElement("div");
    note.className = "playarea-pdf-note";
    const body = document.createElement("div");
    body.className = "playarea-pdf-note-body";
    body.textContent = section.text;
    note.appendChild(body);
    sectionNode.appendChild(note);
  } else if (section.type === "bullet_list" || section.type === "steps") {
    const list = document.createElement("div");
    list.className = "playarea-pdf-stack";

    section.items.forEach((item, index) => {
      const itemNode = document.createElement("div");
      itemNode.className = "playarea-pdf-row";

      const badge = document.createElement("div");
      badge.className = "playarea-pdf-badge";
      badge.textContent = section.type === "steps" ? String(index + 1) : "•";
      badge.style.backgroundColor = item.highlightColor || section.highlightColor || "#3b82f6";
      itemNode.appendChild(badge);

      const content = document.createElement("div");
      content.className = "playarea-pdf-row-content";
      if (item.title.trim()) {
        const itemTitle = document.createElement("h3");
        itemTitle.className = "playarea-pdf-row-title";
        itemTitle.textContent = item.title;
        content.appendChild(itemTitle);
      }
      const itemText = document.createElement("p");
      itemText.className = "playarea-pdf-row-text";
      itemText.textContent = item.text;
      content.appendChild(itemText);
      itemNode.appendChild(content);

      list.appendChild(itemNode);
    });

    sectionNode.appendChild(list);
  } else if (section.type === "flashcards") {
    const grid = document.createElement("div");
    grid.className = "playarea-pdf-flashcards";

    section.cards.forEach((card, index) => {
      const cardNode = document.createElement("article");
      cardNode.className = "playarea-pdf-flashcard";
      cardNode.style.setProperty("--card-accent", card.accentColor || "#2563eb");
      cardNode.style.setProperty("--card-highlight", card.highlightColor || "#fef08a");

      const accent = document.createElement("div");
      accent.className = "playarea-pdf-flashcard-accent";
      cardNode.appendChild(accent);

      const tag = document.createElement("span");
      tag.className = "playarea-pdf-chip";
      tag.textContent = `Card ${index + 1}`;
      cardNode.appendChild(tag);

      const frontBlock = document.createElement("div");
      frontBlock.className = "playarea-pdf-flashcard-side";
      const frontLabel = document.createElement("p");
      frontLabel.className = "playarea-pdf-label";
      frontLabel.textContent = "Front of Card";
      frontBlock.appendChild(frontLabel);
      const frontText = document.createElement("p");
      frontText.className = "playarea-pdf-flashcard-front";
      frontText.textContent = card.front || "Untitled front";
      frontBlock.appendChild(frontText);
      cardNode.appendChild(frontBlock);

      const divider = document.createElement("div");
      divider.className = "playarea-pdf-divider";
      cardNode.appendChild(divider);

      const backBlock = document.createElement("div");
      backBlock.className = "playarea-pdf-flashcard-side";
      const backLabel = document.createElement("p");
      backLabel.className = "playarea-pdf-label";
      backLabel.textContent = "Back of Card";
      backBlock.appendChild(backLabel);
      const backText = document.createElement("p");
      backText.className = "playarea-pdf-flashcard-back";
      backText.textContent = card.back || "Untitled back";
      backBlock.appendChild(backText);
      cardNode.appendChild(backBlock);
      grid.appendChild(cardNode);
    });

    sectionNode.appendChild(grid);
  } else if (section.type === "quiz") {
    const stack = document.createElement("div");
    stack.className = "playarea-pdf-stack";

    section.questions.forEach((question, index) => {
      const card = document.createElement("article");
      card.className = "playarea-pdf-question";

      const header = document.createElement("div");
      header.className = "playarea-pdf-question-header";
      const badge = document.createElement("span");
      badge.className = "playarea-pdf-question-badge";
      badge.textContent = `Question ${index + 1}`;
      badge.style.backgroundColor = question.highlightColor || section.highlightColor || "#10b981";
      header.appendChild(badge);
      card.appendChild(header);

      const qText = document.createElement("h3");
      qText.className = "playarea-pdf-question-title";
      qText.textContent = question.question || "Untitled question";
      card.appendChild(qText);

      const options = document.createElement("div");
      options.className = "playarea-pdf-option-grid";
      question.options.forEach((option, optionIndex) => {
        const optionNode = document.createElement("div");
        optionNode.className = "playarea-pdf-option";

        const optionTag = document.createElement("span");
        optionTag.className = "playarea-pdf-option-tag";
        optionTag.textContent = `Option ${String.fromCharCode(65 + optionIndex)}`;
        optionNode.appendChild(optionTag);

        const optionText = document.createElement("p");
        optionText.className = "playarea-pdf-option-text";
        optionText.textContent = option || `Option ${optionIndex + 1}`;
        optionNode.appendChild(optionText);
        options.appendChild(optionNode);
      });
      card.appendChild(options);

      const answerGrid = document.createElement("div");
      answerGrid.className = "playarea-pdf-answer-grid";
      
      const answerNode = document.createElement("div");
      answerNode.className = "playarea-pdf-answer-card";
      const aLabel = document.createElement("p");
      aLabel.className = "playarea-pdf-label";
      aLabel.textContent = "Correct answer";
      answerNode.appendChild(aLabel);
      const aText = document.createElement("p");
      aText.className = "playarea-pdf-answer";
      aText.textContent = question.answer || "Not set";
      answerNode.appendChild(aText);
      answerGrid.appendChild(answerNode);

      const explanationNode = document.createElement("div");
      explanationNode.className = "playarea-pdf-answer-card";
      const eLabel = document.createElement("p");
      eLabel.className = "playarea-pdf-label";
      eLabel.textContent = "Explanation";
      explanationNode.appendChild(eLabel);
      const eText = document.createElement("p");
      eText.className = "playarea-pdf-row-text";
      eText.textContent = question.explanation || "No explanation added.";
      explanationNode.appendChild(eText);
      answerGrid.appendChild(explanationNode);
      card.appendChild(answerGrid);

      stack.appendChild(card);
    });

    sectionNode.appendChild(stack);
  } else if (section.type === "mindmap") {
    const list = document.createElement("div");
    list.className = "playarea-pdf-stack";
    const depthMap = buildMindmapDepths(section.nodes);

    section.nodes.forEach((node) => {
      const nodeRow = document.createElement("div");
      nodeRow.className = "playarea-pdf-mindmap-row";
      nodeRow.style.marginLeft = `${(depthMap.get(node.id) || 0) * 22}px`;

      const dot = document.createElement("span");
      dot.className = "playarea-pdf-mindmap-dot";
      dot.style.backgroundColor = node.highlightColor || section.highlightColor || "#3b82f6";
      nodeRow.appendChild(dot);

      const label = document.createElement("span");
      label.textContent = node.label;
      nodeRow.appendChild(label);
      list.appendChild(nodeRow);
    });

    sectionNode.appendChild(list);
  } else if (section.type === "graph") {
    if (section.graphUrl) {
      const image = document.createElement("img");
      image.src = section.graphUrl;
      image.alt = section.title;
      image.className = "playarea-pdf-graph";
      image.crossOrigin = "anonymous";
      sectionNode.appendChild(image);
    }

    if (section.graphCaption.trim()) {
      const caption = document.createElement("p");
      caption.className = "playarea-pdf-row-text";
      caption.textContent = section.graphCaption;
      sectionNode.appendChild(caption);
    }
  }

  return sectionNode;
}

function createPdfExportNode(documentData: PlayAreaDocument) {
  const fontScale =
    documentData.appearance.fontScale === "compact"
      ? 0.93
      : documentData.appearance.fontScale === "large"
        ? 1.12
        : 1;
  const noteBackground =
    documentData.appearance.paperStyle === "plain"
      ? "linear-gradient(90deg, transparent 0 2.7rem, rgba(244,63,94,0.16) 2.7rem 2.78rem, transparent 2.78rem 100%), #fffdf8"
      : "linear-gradient(90deg, transparent 0 2.7rem, rgba(244,63,94,0.16) 2.7rem 2.78rem, transparent 2.78rem 100%), repeating-linear-gradient(180deg, transparent 0 31px, rgba(59,130,246,0.1) 31px 32px), #fffdf8";
  const wrapper = document.createElement("div");
  wrapper.id = "playarea-pdf-export-wrapper";
  // CRITICAL: use position:fixed at top:0 so html2canvas can capture the element
  // in viewport coordinates. Using position:absolute with a very negative top
  // places it outside the scroll area and html2canvas captures a blank region.
  // We move it far off-screen horizontally so the user never sees the flicker.
  wrapper.style.position = "fixed";
  wrapper.style.top = "0";
  wrapper.style.left = "-99999px";
  wrapper.style.width = "794px";
  wrapper.style.padding = "40px";
  wrapper.style.background = "#fffdf8";
  wrapper.style.color = "#0f172a";
  wrapper.style.visibility = "visible";
  wrapper.style.opacity = "1";
  wrapper.style.zIndex = "99999";
  wrapper.style.pointerEvents = "none";
  wrapper.style.fontFamily = "'Manrope', 'Inter', system-ui, -apple-system, sans-serif";

  const style = document.createElement("style");
  style.textContent = `
    :root {
      --playarea-note-size: ${18 * fontScale}px;
      --playarea-card-front-size: ${18 * fontScale}px;
      --playarea-card-back-size: ${14 * fontScale}px;
      --playarea-row-size: ${14 * fontScale}px;
    }
    .playarea-pdf-cover {
      padding: 32px;
      border: 1px solid #e2e8f0;
      border-radius: 32px;
      background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 50%, #f1f5f9 100%);
      box-shadow: 0 20px 50px -30px rgba(0, 0, 0, 0.1);
      margin-bottom: 24px;
    }
    .playarea-pdf-title {
      margin: 0;
      font-size: 36px;
      line-height: 1.2;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .playarea-pdf-subtitle {
      margin: 10px 0 0;
      font-size: 16px;
      color: #475569;
      font-weight: 500;
    }
    .playarea-pdf-summary {
      margin: 16px 0 0;
      font-size: 14px;
      line-height: 1.6;
      color: #334155;
    }
    .playarea-pdf-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 20px;
    }
    .playarea-pdf-tag {
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      background: #f8fafc;
    }
    .playarea-pdf-section {
      margin-top: 24px;
      padding: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 28px;
      background: #ffffff;
      break-inside: avoid;
      page-break-inside: avoid;
      box-shadow: 0 10px 30px -15px rgba(0, 0, 0, 0.05);
    }
    .playarea-pdf-kicker {
      margin: 0;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      color: #0ea5e9;
    }
    .playarea-pdf-section-title {
      margin: 6px 0 0;
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .playarea-pdf-note {
      margin-top: 20px;
      padding: 24px 24px 24px 50px;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      background: ${noteBackground};
      min-height: 151px;
    }
    .playarea-pdf-note-body {
      margin: 0;
      white-space: pre-wrap;
      font-size: var(--playarea-note-size);
      line-height: 1.8;
      font-family: "Patrick Hand", "Kalam", cursive;
      color: #1e293b;
    }
    .playarea-pdf-stack {
      margin-top: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .playarea-pdf-row {
      display: flex;
      gap: 16px;
      padding: 16px;
      border: 1px solid #f1f5f9;
      border-radius: 20px;
      background: #f8fafc;
      break-inside: avoid;
    }
    .playarea-pdf-badge {
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 800;
      color: #ffffff;
      box-shadow: 0 4px 12px -4px rgba(0, 0, 0, 0.2);
    }
    .playarea-pdf-row-content {
      flex: 1;
    }
    .playarea-pdf-row-title, .playarea-pdf-question-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }
    .playarea-pdf-row-text, .playarea-pdf-answer {
      margin: 4px 0 0;
      font-size: var(--playarea-row-size);
      line-height: 1.6;
      color: #475569;
    }
    .playarea-pdf-flashcards {
      margin-top: 20px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .playarea-pdf-flashcard {
      position: relative;
      padding: 20px;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      background: #ffffff;
      break-inside: avoid;
      box-shadow: 0 4px 20px -10px rgba(0, 0, 0, 0.1);
    }
    .playarea-pdf-flashcard-accent {
      position: absolute;
      left: 0;
      top: 20px;
      bottom: 20px;
      width: 6px;
      border-radius: 0 4px 4px 0;
      background: var(--card-accent);
    }
    .playarea-pdf-chip {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      background: #f1f5f9;
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 12px;
    }
    .playarea-pdf-flashcard-side {
      margin-bottom: 12px;
    }
    .playarea-pdf-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #94a3b8;
      margin: 0 0 4px 0;
    }
    .playarea-pdf-flashcard-front {
      font-size: var(--playarea-card-front-size);
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .playarea-pdf-flashcard-back {
      font-size: var(--playarea-card-back-size);
      color: #475569;
      margin: 0;
    }
    .playarea-pdf-divider {
      height: 1px;
      background: #f1f5f9;
      margin: 12px 0;
    }
    .playarea-pdf-question {
      padding: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      background: #f8fafc;
      break-inside: avoid;
    }
    .playarea-pdf-question-header {
      margin-bottom: 16px;
    }
    .playarea-pdf-question-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 800;
      color: #ffffff;
    }
    .playarea-pdf-option-grid {
      margin: 16px 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .playarea-pdf-option {
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      background: #ffffff;
    }
    .playarea-pdf-option-tag {
      font-size: 9px;
      font-weight: 800;
      color: #94a3b8;
      display: block;
      margin-bottom: 2px;
    }
    .playarea-pdf-option-text {
      font-size: 13px;
      color: #334155;
      margin: 0;
    }
    .playarea-pdf-answer-grid {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 12px;
      margin-top: 16px;
    }
    .playarea-pdf-answer-card {
      padding: 12px;
      border-radius: 16px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
    }
    .playarea-pdf-answer {
      font-weight: 700;
      color: #10b981;
      margin: 0;
    }
    .playarea-pdf-mindmap-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }
    .playarea-pdf-mindmap-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .playarea-pdf-graph {
      width: 100%;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      margin-top: 16px;
    }
  `;
  wrapper.appendChild(style);

  const cover = document.createElement("div");
  cover.className = "playarea-pdf-cover";
  wrapper.appendChild(cover);

  const title = document.createElement("h1");
  title.className = "playarea-pdf-title";
  title.textContent = documentData.title;
  cover.appendChild(title);

  if (documentData.subtitle.trim()) {
    appendTextParagraph(cover, documentData.subtitle, "playarea-pdf-subtitle");
  }

  if (documentData.summary.trim()) {
    appendTextParagraph(cover, documentData.summary, "playarea-pdf-summary");
  }

  if (documentData.tags.length) {
    const tags = document.createElement("div");
    tags.className = "playarea-pdf-tags";
    documentData.tags.forEach((tag) => {
      const tagNode = document.createElement("span");
      tagNode.className = "playarea-pdf-tag";
      tagNode.textContent = tag;
      tags.appendChild(tagNode);
    });
    cover.appendChild(tags);
  }

  documentData.sections.forEach((section) => {
    wrapper.appendChild(createSectionNode(section));
  });

  return wrapper;
}

async function waitForImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
  
  // Ensure fonts are loaded before rendering
  try {
    await document.fonts.ready;
  } catch (e) {
    console.warn("Font loading failed, proceeding with system fonts", e);
  }
}

export async function exportPlayAreaDocumentPdf(documentData: PlayAreaDocument) {
  const wrapper = createPdfExportNode(documentData);
  document.body.appendChild(wrapper);

  try {
    await waitForImages(wrapper);

    // Give fonts and layout a couple of frames to fully settle
    await new Promise(resolve => setTimeout(resolve, 300));

    // Use html2canvas to render the wrapper.
    // scrollX/scrollY = 0 because the wrapper is position:fixed and
    // windowWidth must be >= the wrapper width so the layout isn't collapsed.
    const canvas = await html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#fffdf8",
      logging: false,
      allowTaint: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794 + 80, // wrapper width + padding
      width: wrapper.scrollWidth,
      height: wrapper.scrollHeight,
    });

    // A4 dimensions in mm
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const marginMm = 10;
    const contentWidthMm = pageWidthMm - marginMm * 2;
    const contentHeightMm = pageHeightMm - marginMm * 2;

    // Scale factor: how many pdf-mm per canvas-px
    const pxPerMm = canvas.width / contentWidthMm;
    const contentHeightPx = contentHeightMm * pxPerMm;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const totalPagesNeeded = Math.ceil(canvas.height / contentHeightPx);

    for (let page = 0; page < totalPagesNeeded; page++) {
      if (page > 0) {
        pdf.addPage();
      }

      // Slice the canvas for each page
      const sourceY = page * contentHeightPx;
      const sliceHeight = Math.min(contentHeightPx, canvas.height - sourceY);

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      }

      const imgData = pageCanvas.toDataURL("image/jpeg", 0.97);
      const sliceHeightMm = (sliceHeight / pxPerMm);
      pdf.addImage(imgData, "JPEG", marginMm, marginMm, contentWidthMm, sliceHeightMm);
    }

    pdf.save(`${sanitizeFileName(documentData.title)}.pdf`);
  } catch (error) {
    console.error("PDF Export failed:", error);
    throw error;
  } finally {
    wrapper.remove();
  }
}
