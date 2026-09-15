import EmblaCarousel from 'embla-carousel';

/**
 * Organism: Constituents Carousel Controller
 * Initializes Embla Carousel with looping and navigation buttons.
 */
export function initConstituentsCarousel(viewportSelector = '#constituents-embla') {
  const viewportNode = document.querySelector(viewportSelector);
  if (!viewportNode) return;

  const prevBtn = document.querySelector('#constituents-prev');
  const nextBtn = document.querySelector('#constituents-next');

  const emblaApi = EmblaCarousel(viewportNode, {
    loop: true,
    align: 'start',
    skipSnaps: false,
    dragFree: false
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', () => emblaApi.scrollPrev());
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => emblaApi.scrollNext());
  }

  return emblaApi;
}
