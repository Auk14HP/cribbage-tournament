import { expect, type Locator } from '@playwright/test';

// Wholly on screen: inside the window and not cut off by a list scrolled past it or clipping it.
export const expectWhollyOnScreen = async (elements: Locator[]) => {
	for (const element of elements) {
		await expect(element).toBeInViewport({ ratio: 1 });
	}
};
