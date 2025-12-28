/**
 * @fileoverview MapSettings - Configurable map feature toggle component
 *
 * This component provides a reusable settings panel for map feature controls,
 * supporting both full feature exposure and selective feature display based on
 * enabledFeatures prop configuration.
 *
 * @author Handled Platform Team
 * @version 1.0.0
 * @since 2025-12-28
 */

/**
 * MapSettings Component
 * =====================
 *
 * PURPOSE:
 * Reusable UI component providing configurable toggles for map feature controls.
 * Enables developers to expose all map settings or selective subsets based on
 * application context and user permissions.
 *
 * KEY FEATURES:
 * ✅ Selective feature display via enabledFeatures prop
 * ✅ Close button with onClose callback
 * ✅ TypeScript type safety with MapFeatureFlags
 * ✅ Consistent dark theme styling
 * ✅ Hover effects and visual feedback
 *
 * ARCHITECTURAL DECISIONS:
 * - Conditional rendering based on enabledFeatures array
 * - Absolute positioning for close button in header
 * - Flexible className prop for custom positioning
 * - Partial settings updates via onSettingsChange callback
 *
 * USAGE PATTERNS:
 *
 * 1. Full Control (Default):
 *    <MapSettings
 *      settings={mapSettings}
 *      onSettingsChange={setMapSettings}
 *      onClose={() => setShowSettings(false)}
 *    />
 *
 * 2. Selective Features:
 *    <MapSettings
 *      settings={mapSettings}
 *      enabledFeatures={['enableHover', 'enableLegend']}
 *      onSettingsChange={handleSettingsUpdate}
 *    />
 *
 * 3. Minimal UI:
 *    <MapSettings
 *      settings={mapSettings}
 *      showHeader={false}
 *      onSettingsChange={updateSettings}
 *    />
 *
 * PROPS INTERFACE:
 * - settings: Current MapFeatureFlags state
 * - onSettingsChange: Callback for partial settings updates
 * - enabledFeatures?: Array of features to display
 * - className?: Additional CSS classes
 * - showHeader?: Whether to show "Map Settings" title
 * - onClose?: Optional close button callback
 *
 * FEATURE FLAGS CONTROLLED:
 * - enableDragging: Allow moving warehouse markers
 * - enableHover: Show hover effects and tooltips
 * - enableTooltips: Display detailed information popups
 * - enableZip3Boundaries: Show ZIP3 area boundaries
 * - enableStateBoundaries: Show state boundary lines
 * - enableAnimation: Enable marker pulsing animations
 * - enableLegend: Show transit time legend
 *
 * STYLING:
 * - Dark theme with terminal-inspired appearance
 * - Monospace font for technical feel
 * - Hover effects on interactive elements
 * - Consistent spacing and typography
 *
 * ACCESSIBILITY:
 * - Keyboard accessible checkboxes
 * - Screen reader friendly labels
 * - Focus management for close button
 * - Semantic HTML structure
 *
 * PERFORMANCE:
 * - Conditional rendering prevents unnecessary DOM elements
 * - Efficient re-renders via React.memo (if needed)
 * - Minimal CSS for fast rendering
 */

import { X } from 'lucide-react';
import type { MapFeatureFlags } from './types';

export interface MapSettingsProps {
  /** Current map settings state */
  settings: MapFeatureFlags;
  /** Callback when settings change */
  onSettingsChange: (settings: Partial<MapFeatureFlags>) => void;
  /** Which features to display (undefined = show all) */
  enabledFeatures?: (keyof MapFeatureFlags)[];
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the header */
  showHeader?: boolean;
  /** Callback when close button is clicked */
  onClose?: () => void;
}

/**
 * MapSettings - Configurable UI for map feature toggles
 *
 * Provides a reusable settings panel that can display all map features
 * or a selective subset based on the enabledFeatures prop.
 */
export function MapSettings({
  settings,
  onSettingsChange,
  enabledFeatures,
  className = '',
  showHeader = true,
  onClose
}: MapSettingsProps) {
  // All available features
  const allFeatures: (keyof MapFeatureFlags)[] = [
    'enableDragging',
    'enableHover',
    'enableTooltips',
    'enableZip3Boundaries',
    'enableStateBoundaries',
    'enableAnimation',
    'enableLegend'
  ];

  // Filter to enabled features or show all
  const featuresToShow = enabledFeatures || allFeatures;

  // Helper to create change handler
  const createChangeHandler = (feature: keyof MapFeatureFlags) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSettingsChange({ [feature]: e.target.checked });
    };

  // Helper to check if feature should be shown
  const shouldShowFeature = (feature: keyof MapFeatureFlags) =>
    featuresToShow.includes(feature);

  return (
    <div className={`bg-[#1e1e1e] border border-[#3e3e3e] rounded shadow-lg p-3 min-w-[220px] font-mono text-xs relative ${className}`}>
      {showHeader && (
        <div className="relative mb-2">
          <div className="text-[#d4d4d4] font-semibold text-[11px]">Map Settings</div>
          {onClose && (
            <button
              onClick={onClose}
              className="absolute -top-1 -right-1 text-[#d4d4d4] hover:text-[#ffffff] hover:bg-[#2d2d2d] rounded p-0.5 transition-colors"
              title="Close settings"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <div className="space-y-1">
        {/* Draggable */}
        {shouldShowFeature('enableDragging') && (
          <label className="flex items-center gap-2 text-[#d4d4d4] hover:bg-[#2d2d2d] px-1 py-0.5 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableDragging}
              onChange={createChangeHandler('enableDragging')}
              className="w-3 h-3 accent-[#4f8bf9]"
            />
            <span>draggable:</span>
            <span className="text-[#4f8bf9] ml-auto">{settings.enableDragging ? 'true' : 'false'}</span>
          </label>
        )}

        {/* Hover */}
        {shouldShowFeature('enableHover') && (
          <label className="flex items-center gap-2 text-[#d4d4d4] hover:bg-[#2d2d2d] px-1 py-0.5 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableHover}
              onChange={createChangeHandler('enableHover')}
              className="w-3 h-3 accent-[#4f8bf9]"
            />
            <span>hover:</span>
            <span className="text-[#4f8bf9] ml-auto">{settings.enableHover ? 'true' : 'false'}</span>
          </label>
        )}

        {/* Tooltips */}
        {shouldShowFeature('enableTooltips') && (
          <label className="flex items-center gap-2 text-[#d4d4d4] hover:bg-[#2d2d2d] px-1 py-0.5 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableTooltips}
              onChange={createChangeHandler('enableTooltips')}
              className="w-3 h-3 accent-[#4f8bf9]"
            />
            <span>tooltips:</span>
            <span className="text-[#4f8bf9] ml-auto">{settings.enableTooltips ? 'true' : 'false'}</span>
          </label>
        )}

        {/* Boundaries Section */}
        {(shouldShowFeature('enableZip3Boundaries') || shouldShowFeature('enableStateBoundaries')) && (
          <div className="flex items-center gap-2 text-[#d4d4d4] px-1 py-0.5">
            <span>boundaries:</span>
            <div className="flex gap-1 ml-auto">
              {shouldShowFeature('enableZip3Boundaries') && (
                <label className="flex items-center gap-1 hover:bg-[#2d2d2d] px-1 py-0.5 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableZip3Boundaries}
                    onChange={createChangeHandler('enableZip3Boundaries')}
                    className="w-3 h-3 accent-[#4f8bf9]"
                  />
                  <span className="text-[#6a9955]">ZIP3</span>
                </label>
              )}
              {shouldShowFeature('enableStateBoundaries') && (
                <label className="flex items-center gap-1 hover:bg-[#2d2d2d] px-1 py-0.5 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableStateBoundaries}
                    onChange={createChangeHandler('enableStateBoundaries')}
                    className="w-3 h-3 accent-[#4f8bf9]"
                  />
                  <span className="text-[#6a9955]">State</span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Animation */}
        {shouldShowFeature('enableAnimation') && (
          <label className="flex items-center gap-2 text-[#d4d4d4] hover:bg-[#2d2d2d] px-1 py-0.5 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableAnimation}
              onChange={createChangeHandler('enableAnimation')}
              className="w-3 h-3 accent-[#4f8bf9]"
            />
            <span>animation:</span>
            <span className="text-[#4f8bf9] ml-auto">{settings.enableAnimation ? 'true' : 'false'}</span>
          </label>
        )}

        {/* Legend */}
        {shouldShowFeature('enableLegend') && (
          <label className="flex items-center gap-2 text-[#d4d4d4] hover:bg-[#2d2d2d] px-1 py-0.5 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableLegend}
              onChange={createChangeHandler('enableLegend')}
              className="w-3 h-3 accent-[#4f8bf9]"
            />
            <span>legend:</span>
            <span className="text-[#4f8bf9] ml-auto">{settings.enableLegend ? 'true' : 'false'}</span>
          </label>
        )}
      </div>
    </div>
  );
}
