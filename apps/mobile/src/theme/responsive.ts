import { Dimensions } from 'react-native';
import { useState, useEffect } from 'react';

const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function scale(size: number): number {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
}

export function verticalScale(size: number): number {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
}

export function moderateScale(size: number, factor: number = 0.5): number {
  return size + (scale(size) - size) * factor;
}

export const breakpoints = {
  mobile: 0,
  tablet: 640,
  desktop: 1024,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export function useResponsive() {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription.remove();
  }, []);

  const { width } = dimensions;

  const isMobile = width < breakpoints.tablet;
  const isTablet = width >= breakpoints.tablet && width < breakpoints.desktop;
  const isDesktop = width >= breakpoints.desktop;

  const columns = isDesktop ? 4 : isTablet ? 3 : 2;

  return {
    isMobile,
    isTablet,
    isDesktop,
    width,
    columns,
  };
}
