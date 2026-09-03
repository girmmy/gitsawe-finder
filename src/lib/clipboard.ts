/**
 * Copying text, for browsers that refuse the async clipboard.
 *
 * `navigator.clipboard.writeText` rejects in more cases than it looks like it
 * should — an unfocused document, a non-secure origin, Safari and Firefox when
 * the call is too far from the click that caused it. Unhandled, that rejection
 * left the button silent: nothing copied and nothing said. So the rejection is
 * caught, the old `execCommand` path is tried after it, and the caller is told
 * whether either worked.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through: the browser has a clipboard API but would not use it.
  }
  return legacyCopy(text);
}

/**
 * The pre-clipboard-API path. Deprecated everywhere and still the only thing
 * that works in some of the cases above.
 */
function legacyCopy(text: string): boolean {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  // Off-screen but focusable, and fixed so selecting it cannot scroll the page.
  area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  document.body.appendChild(area);
  const selection = document.getSelection();
  const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  try {
    area.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
    // Putting back whatever the reader had selected before we borrowed it.
    if (previous && selection) {
      selection.removeAllRanges();
      selection.addRange(previous);
    }
  }
}
