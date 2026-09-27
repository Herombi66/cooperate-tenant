/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { StatsCard } from './StatsCard';
import { Users } from 'lucide-react';

describe('StatsCard Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders clean rebalanced layout without decorative icons when icon is omitted', () => {
    const { container } = render(
      <StatsCard
        title="Total Members"
        value="1,450"
        trend={{ value: 12.5, isPositive: true }}
        description="Active registered members"
      />
    );

    const card = screen.getByTestId('stats-card-no-icon');
    expect(card).toBeTruthy();

    // Verify title and value
    expect(screen.getByText('Total Members')).toBeTruthy();
    expect(screen.getByText('1,450')).toBeTruthy();

    // Verify trend percentage indicator (+12.5%)
    expect(screen.getByText('+12.5%')).toBeTruthy();

    // Verify description
    expect(screen.getByText('Active registered members')).toBeTruthy();

    // Verify that NO decorative SVG icons exist inside the card
    const svgs = card.querySelectorAll('svg');
    expect(svgs.length).toBe(0);

    // Verify theme classes for light/dark mode support
    expect(card.className).toContain('bg-card');
    expect(card.className).toContain('text-card-foreground');
    expect(card.className).toContain('border-border');
  });

  it('renders negative trend correctly without decorative icons', () => {
    render(
      <StatsCard
        title="Pending Loans"
        value="8"
        trend={{ value: 4.2, isPositive: false }}
        description="Awaiting review"
      />
    );

    expect(screen.getByText('-4.2%')).toBeTruthy();
    expect(screen.getByText('Pending Loans')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText('Awaiting review')).toBeTruthy();
  });

  it('renders legacy layout with icon when icon prop is explicitly provided', () => {
    const { container } = render(
      <StatsCard
        title="Legacy Stat"
        value="500"
        icon={Users}
        color="blue"
      />
    );

    const card = screen.getByTestId('stats-card-with-icon');
    expect(card).toBeTruthy();

    // Verify that the icon SVG is rendered
    const svg = card.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});
