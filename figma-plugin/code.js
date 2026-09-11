// Sheshi Frame to PPTX - Figma Canvas Bridge
// Runs inside the Figma sandbox (QuickJS engine)

figma.showUI(__html__, {
  width: 440,
  height: 680,
  themeColors: true,
  title: 'Sheshi Frame to PPTX'
});

// Helper: Convert Uint8Array to Base64
function uint8ArrayToBase64(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return figma.base64Encode(bytes);
}

// Helper: Extract solid background color from frame fills
function getFrameBackgroundColor(node) {
  if (node.fills && Array.isArray(node.fills)) {
    for (const fill of node.fills) {
      if (fill.visible !== false && fill.type === 'SOLID' && fill.color) {
        const r = Math.round(fill.color.r * 255).toString(16).padStart(2, '0');
        const g = Math.round(fill.color.g * 255).toString(16).padStart(2, '0');
        const b = Math.round(fill.color.b * 255).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
    }
  }
  return '#FFFFFF';
}

// Helper: Extract notes / description from frame
function getFrameNotes(node) {
  let notes = '';
  if (node.description && typeof node.description === 'string') {
    notes += node.description + '\n';
  }
  return notes.trim();
}

// Helper: Sort frames in natural reading order (top-to-bottom, left-to-right)
function sortFramesInReadingOrder(frames) {
  return [...frames].sort((a, b) => {
    const yDiff = a.y - b.y;
    // If frames are roughly on the same row (within 40px), sort by X (left to right)
    if (Math.abs(yDiff) < 40) {
      return a.x - b.x;
    }
    return yDiff;
  });
}

// Find candidate frames (either user selection or all top-level frames on active page)
function getCandidateFrames() {
  const selection = figma.currentPage.selection;
  let frames = [];

  if (selection.length > 0) {
    // Filter selection for frames, components, or sections
    for (const node of selection) {
      if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'SECTION') {
        frames.push(node);
      }
    }
  }

  // If no frame selected in current selection, gather top-level frames from current page
  if (frames.length === 0) {
    for (const child of figma.currentPage.children) {
      if (child.type === 'FRAME' || child.type === 'COMPONENT' || child.type === 'SECTION') {
        frames.push(child);
      }
    }
  }

  return sortFramesInReadingOrder(frames);
}

// Scan and send frames to UI
async function scanAndSendFrames(includeThumbnails = true) {
  const frames = getCandidateFrames();
  const isCustomSelection = figma.currentPage.selection.some(
    n => n.type === 'FRAME' || n.type === 'COMPONENT' || n.type === 'SECTION'
  );

  const payload = [];

  for (let i = 0; i < frames.length; i++) {
    const node = frames[i];
    let thumbnailBase64 = null;

    if (includeThumbnails) {
      try {
        // Generate small thumbnail for UI preview
        const thumbBytes = await node.exportAsync({
          format: 'PNG',
          constraint: { type: 'SCALE', value: 0.2 }
        });
        thumbnailBase64 = `data:image/png;base64,${figma.base64Encode(thumbBytes)}`;
      } catch (err) {
        console.warn('Could not generate thumbnail for node', node.name, err);
      }
    }

    payload.push({
      id: node.id,
      name: node.name,
      width: Math.round(node.width),
      height: Math.round(node.height),
      aspectRatio: Number((node.width / node.height).toFixed(2)),
      bgColor: getFrameBackgroundColor(node),
      notes: getFrameNotes(node),
      thumbnail: thumbnailBase64,
      slideNumber: i + 1
    });
  }

  figma.ui.postMessage({
    type: 'FRAMES_DETECTED',
    frames: payload,
    isCustomSelection: isCustomSelection,
    pageName: figma.currentPage.name
  });
}

// Listen for selection changes in Figma canvas
figma.on('selectionchange', () => {
  scanAndSendFrames(true);
});

// Handle incoming messages from UI (via ui.html relay)
figma.ui.onmessage = async (msg) => {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'INIT':
    case 'SCAN_FRAMES': {
      await scanAndSendFrames(true);
      break;
    }

    case 'FOCUS_FRAME': {
      if (msg.frameId) {
        const node = figma.getNodeById(msg.frameId);
        if (node && 'type' in node) {
          figma.currentPage.selection = [node];
          figma.viewport.scrollAndZoomIntoView([node]);
        }
      }
      break;
    }

    case 'EXPORT_SLIDES': {
      const { slideConfigs, quality = 2 } = msg;
      if (!Array.isArray(slideConfigs) || slideConfigs.length === 0) {
        figma.notify('No frames selected for export', { error: true });
        return;
      }

      const total = slideConfigs.length;
      figma.notify(`Exporting ${total} slides at ${quality}x resolution...`, { timeout: 2000 });

      for (let i = 0; i < total; i++) {
        const item = slideConfigs[i];
        const node = figma.getNodeById(item.id);

        if (!node) {
          figma.ui.postMessage({
            type: 'EXPORT_ERROR',
            error: `Frame not found: ${item.name}`,
            index: i
          });
          continue;
        }

        // Notify UI of progress
        figma.ui.postMessage({
          type: 'EXPORT_PROGRESS',
          index: i + 1,
          total: total,
          frameName: node.name
        });

        try {
          const exportBytes = await node.exportAsync({
            format: 'PNG',
            constraint: { type: 'SCALE', value: quality }
          });

          const base64Data = figma.base64Encode(exportBytes);

          figma.ui.postMessage({
            type: 'SLIDE_EXPORTED',
            index: i,
            id: node.id,
            name: node.name,
            width: Math.round(node.width),
            height: Math.round(node.height),
            bgColor: item.bgColor || getFrameBackgroundColor(node),
            notes: item.notes || getFrameNotes(node),
            imageData: `data:image/png;base64,${base64Data}`
          });
        } catch (err) {
          figma.ui.postMessage({
            type: 'EXPORT_ERROR',
            error: `Failed to export ${node.name}: ${String(err)}`,
            index: i
          });
        }
      }

      figma.ui.postMessage({
        type: 'ALL_SLIDES_EXPORTED',
        total: total
      });
      break;
    }

    case 'NOTIFY': {
      if (msg.message) {
        figma.notify(msg.message, {
          error: !!msg.isError,
          timeout: msg.timeout || 3000
        });
      }
      break;
    }

    case 'RESIZE_WINDOW': {
      if (msg.width && msg.height) {
        figma.ui.resize(msg.width, msg.height);
      }
      break;
    }

    case 'CLOSE_PLUGIN': {
      figma.closePlugin();
      break;
    }
  }
};

// Initial scan when plugin loads
scanAndSendFrames(true);
