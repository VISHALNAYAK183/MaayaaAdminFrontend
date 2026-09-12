/**
 * Preview viewport sizes.
 *
 * Real device widths, not approximations: the frame renders at these and is
 * scaled to fit, so the page inside trips exactly the breakpoints a customer's
 * phone or laptop would.
 */
export interface Device {
  label: string;
  width: number;
  height: number;
}

export const DEVICES: Device[] = [
  { label: "Desktop", width: 1440, height: 900 },
  { label: "Tablet", width: 768, height: 1024 },
  { label: "Mobile", width: 375, height: 812 },
];
