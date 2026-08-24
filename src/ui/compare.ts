/**
 * Before/after slider.
 *
 * Both layers must be laid out at identical pixel dimensions or the wipe reveals
 * a misaligned image. The "after" image drives the layout and the "before" copy
 * is pinned on top of it at the same measured size.
 */
export class CompareSlider {
  private readonly root: HTMLElement;
  private readonly before: HTMLElement;
  private readonly handle: HTMLElement;
  private readonly range: HTMLInputElement;
  private readonly afterImg: HTMLImageElement;
  private readonly beforeImg: HTMLImageElement;
  private observer: ResizeObserver | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    this.before = root.querySelector<HTMLElement>('.compare__before')!;
    this.handle = root.querySelector<HTMLElement>('.compare__handle')!;
    this.range = root.querySelector<HTMLInputElement>('.compare__range')!;
    this.afterImg = root.querySelector<HTMLImageElement>('#compareAfter')!;
    this.beforeImg = root.querySelector<HTMLImageElement>('#compareBefore')!;

    this.range.addEventListener('input', () => this.setPosition(Number(this.range.value)));
    this.afterImg.addEventListener('load', () => this.syncSize());

    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.syncSize());
      this.observer.observe(this.afterImg);
    }
  }

  setImages(beforeUrl: string, afterUrl: string): void {
    this.beforeImg.src = beforeUrl;
    this.afterImg.src = afterUrl;
    this.syncSize();
  }

  setPosition(percent: number): void {
    const clamped = Math.min(100, Math.max(0, percent));
    this.before.style.width = `${clamped}%`;
    this.handle.style.left = `${clamped}%`;
    this.range.value = String(clamped);
  }

  setResultOnly(resultOnly: boolean): void {
    this.root.classList.toggle('is-result-only', resultOnly);
  }

  /** Lock the clipped copy to the rendered size of the visible layer. */
  private syncSize(): void {
    const { width, height } = this.afterImg.getBoundingClientRect();
    if (width > 0 && height > 0) {
      this.before.style.setProperty('--compare-w', `${width}px`);
      this.before.style.setProperty('--compare-h', `${height}px`);
    }
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}
