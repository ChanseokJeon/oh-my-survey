// src/lib/theme/extractor.ts

import sharp from 'sharp';
import { rgbToHex } from './color-utils';
import { rgbToHue, rgbToChroma } from './oklab';

/**
 * Color with pixel area coverage percentage.
 */
export interface ColorWithArea {
  hex: string;
  percentage: number; // 0-1, pixel count / total pixels
}

/**
 * Extracts dominant colors from an image using K-means clustering.
 * @param imageBuffer - Image buffer
 * @returns Array of HEX color strings (up to 5 colors)
 */
export async function extractColors(imageBuffer: Buffer): Promise<string[]> {
  // 1. Resize to 100x100 for performance
  const { data, info } = await sharp(imageBuffer)
    .resize(100, 100, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 2. Convert pixel data to RGB array
  const pixels: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += info.channels) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  // 3. Extract 5 representative colors using K-means
  const palette = kMeansClustering(pixels, 5);

  // 4. Convert to HEX
  return palette.map(([r, g, b]) => rgbToHex(r, g, b));
}

/**
 * K-means clustering for color palette extraction.
 * @param pixels - Array of RGB tuples
 * @param k - Number of clusters (representative colors)
 * @param maxIterations - Maximum iterations for convergence
 * @returns Array of RGB centroids
 */
function kMeansClustering(
  pixels: [number, number, number][],
  k: number,
  maxIterations = 10
): [number, number, number][] {
  // Initialize centroids randomly
  const centroids: [number, number, number][] = [];
  const step = Math.floor(pixels.length / k);
  for (let i = 0; i < k; i++) {
    centroids.push([...pixels[i * step]]);
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign each pixel to the nearest centroid
    const clusters: [number, number, number][][] = Array.from(
      { length: k },
      () => []
    );

    for (const pixel of pixels) {
      let minDist = Infinity;
      let minIndex = 0;

      for (let i = 0; i < k; i++) {
        const dist = euclideanDistance(pixel, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          minIndex = i;
        }
      }

      clusters[minIndex].push(pixel);
    }

    // Recalculate centroids
    let converged = true;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue;

      const newCentroid = calculateMean(clusters[i]);
      if (euclideanDistance(centroids[i], newCentroid) > 1) {
        converged = false;
      }
      centroids[i] = newCentroid;
    }

    if (converged) break;
  }

  // Sort by brightness (darkest to lightest) for consistent ordering
  return centroids
    .map((c) => ({
      color: c,
      brightness: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2],
    }))
    .sort((a, b) => b.brightness - a.brightness)
    .map((item) => item.color);
}

/**
 * Calculates Euclidean distance between two RGB colors.
 */
function euclideanDistance(
  c1: [number, number, number],
  c2: [number, number, number]
): number {
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Calculates the mean color of an array of RGB colors.
 */
function calculateMean(
  colors: [number, number, number][]
): [number, number, number] {
  const sum = colors.reduce(
    (acc, color) => {
      acc[0] += color[0];
      acc[1] += color[1];
      acc[2] += color[2];
      return acc;
    },
    [0, 0, 0]
  );

  const count = colors.length;
  return [
    Math.round(sum[0] / count),
    Math.round(sum[1] / count),
    Math.round(sum[2] / count),
  ];
}

/**
 * Calculates the HSV saturation value from RGB color.
 * @returns Saturation value between 0 and 1
 */
function rgbToSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max; // HSV saturation formula
}

/**
 * Finds the most saturated pixel in a cluster.
 * This preserves vibrant colors instead of averaging them with white/gray pixels.
 */
function getMostSaturatedPixel(
  cluster: [number, number, number][]
): [number, number, number] {
  if (cluster.length === 0) return [0, 0, 0];

  let maxSaturation = -1;
  let mostSaturatedPixel: [number, number, number] = cluster[0];

  for (const pixel of cluster) {
    const saturation = rgbToSaturation(pixel[0], pixel[1], pixel[2]);
    if (saturation > maxSaturation) {
      maxSaturation = saturation;
      mostSaturatedPixel = pixel;
    }
  }

  return mostSaturatedPixel;
}

/**
 * K-means clustering with pixel area tracking.
 * @param pixels - Array of RGB tuples
 * @param k - Number of clusters
 * @param maxIterations - Maximum iterations for convergence
 * @returns Array of centroids with their pixel counts
 */
function kMeansClusteringWithArea(
  pixels: [number, number, number][],
  k: number,
  maxIterations = 10
): { centroid: [number, number, number]; pixelCount: number }[] {
  // Initialize centroids using same strategy as existing kMeansClustering
  const centroids: [number, number, number][] = [];
  const step = Math.floor(pixels.length / k);
  for (let i = 0; i < k; i++) {
    centroids.push([...pixels[i * step]]);
  }

  let clusterSizes: number[] = new Array(k).fill(0);
  let finalClusters: [number, number, number][][] = [];

  for (let iter = 0; iter < maxIterations; iter++) {
    const clusters: [number, number, number][][] = Array.from({ length: k }, () => []);
    clusterSizes = new Array(k).fill(0);

    // Assign each pixel to nearest centroid
    for (const pixel of pixels) {
      let minDist = Infinity;
      let minIndex = 0;

      for (let i = 0; i < k; i++) {
        const dist = euclideanDistance(pixel, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          minIndex = i;
        }
      }

      clusters[minIndex].push(pixel);
      clusterSizes[minIndex]++;
    }

    // Save clusters for final iteration
    finalClusters = clusters;

    // Recalculate centroids
    let converged = true;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue;
      const newCentroid = calculateMean(clusters[i]);
      if (euclideanDistance(centroids[i], newCentroid) > 1) {
        converged = false;
      }
      centroids[i] = newCentroid;
    }

    if (converged) break;
  }

  // Instead of returning average centroids, return the most saturated pixel from each cluster
  // This preserves vibrant colors instead of muddying them with white/gray pixels
  return finalClusters.map((cluster, i) => ({
    centroid: getMostSaturatedPixel(cluster),
    pixelCount: clusterSizes[i]
  }));
}

/**
 * Extracts colors with area coverage percentages using vision-first approach.
 * @param imageBuffer - Image buffer
 * @returns Array of colors with area percentages, sorted by percentage (descending)
 */
export async function extractColorsWithArea(imageBuffer: Buffer): Promise<ColorWithArea[]> {
  // Same preprocessing as extractColors: resize to 100x100
  const { data, info } = await sharp(imageBuffer)
    .resize(100, 100, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Convert to RGB tuples
  const pixels: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += info.channels) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  const totalPixels = pixels.length;
  const results = kMeansClusteringWithArea(pixels, 8);

  // Convert to ColorWithArea, sorted by area (descending)
  return results
    .map(({ centroid, pixelCount }) => ({
      hex: rgbToHex(centroid[0], centroid[1], centroid[2]),
      percentage: pixelCount / totalPixels
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

/**
 * Extracts colors using 12-bin hue classification to prevent cross-hue contamination.
 * This algorithm uses perceptually accurate Oklab hue to prevent color shifts.
 *
 * Algorithm:
 * 1. Resize image to 100x100
 * 2. Convert each pixel to Oklab/OkLCh to get perceptually accurate hue
 * 3. Create 12 hue bins (0-30°, 30-60°, ..., 330-360°) + 1 neutral bin for low-saturation pixels
 * 4. Assign each pixel to appropriate bin based on hue angle
 * 5. For each bin with significant pixels (>2% of total), find the MOST SATURATED pixel
 * 6. Return colors sorted by bin pixel count (largest first)
 *
 * This prevents hue shift because:
 * - Cyan (#00B693, ~168°) and Lime (#3ED754, ~128°) fall in DIFFERENT bins
 * - Bin boundaries: 120-150° (green), 150-180° (cyan)
 * - They cannot contaminate each other during clustering
 *
 * @param imageBuffer - Image buffer
 * @returns Array of colors with area percentages, sorted by percentage (descending)
 */
export async function extractColorsHueBinning(imageBuffer: Buffer): Promise<ColorWithArea[]> {
  // 1. Resize to 100x100 for performance
  const { data, info } = await sharp(imageBuffer)
    .resize(100, 100, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 2. Convert pixel data to RGB array
  const pixels: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += info.channels) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  const totalPixels = pixels.length;

  // 3. Create 13 bins: 12 hue bins (30° each) + 1 neutral bin
  const HUE_BIN_COUNT = 12;
  const HUE_BIN_SIZE = 360 / HUE_BIN_COUNT; // 30 degrees per bin
  const NEUTRAL_SATURATION_THRESHOLD = 0.15; // OkLCh chroma threshold for neutral colors

  // Each bin stores pixels: bins[0] = 0-30°, bins[1] = 30-60°, ..., bins[12] = neutral
  const bins: [number, number, number][][] = Array.from(
    { length: HUE_BIN_COUNT + 1 },
    () => []
  );

  // 4. Assign each pixel to appropriate hue bin
  for (const pixel of pixels) {
    const [r, g, b] = pixel;
    const hue = rgbToHue(r, g, b);
    const chroma = rgbToChroma(r, g, b);

    // Check if pixel is neutral (low saturation)
    if (chroma < NEUTRAL_SATURATION_THRESHOLD) {
      bins[HUE_BIN_COUNT].push(pixel); // neutral bin
      continue;
    }

    // Assign to hue bin based on hue angle
    const binIndex = Math.floor(hue / HUE_BIN_SIZE) % HUE_BIN_COUNT;
    bins[binIndex].push(pixel);
  }

  // 5. Extract representative color from each bin with significant pixels
  const SIGNIFICANCE_THRESHOLD = 0.02; // 2% of total pixels
  const results: ColorWithArea[] = [];

  for (let i = 0; i < bins.length; i++) {
    const bin = bins[i];
    const pixelCount = bin.length;
    const percentage = pixelCount / totalPixels;

    // Skip bins with insignificant pixel count
    if (percentage < SIGNIFICANCE_THRESHOLD) {
      continue;
    }

    // Find the most saturated pixel in this bin
    const representativeColor = getMostSaturatedPixel(bin);

    results.push({
      hex: rgbToHex(representativeColor[0], representativeColor[1], representativeColor[2]),
      percentage
    });
  }

  // 6. Sort by percentage (largest first)
  return results.sort((a, b) => b.percentage - a.percentage);
}
