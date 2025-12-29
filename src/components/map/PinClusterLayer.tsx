/**
 * PinClusterLayer Component
 * 
 * Renders photo pins as markers on the map with clustering support.
 * Distinguishes between photographer pins (gold) and regular user pins (blue).
 */

import React, { useMemo } from 'react';
import { Source, Layer, Marker } from 'react-map-gl/mapbox';
import type { CircleLayer, SymbolLayer } from 'react-map-gl/mapbox';
import type { PhotoListItemDto } from '@/types';
import { photosToPins } from '@/lib/utils/mapHelpers';

interface PinClusterLayerProps {
  photos: PhotoListItemDto[];
  selectedPhotoId: string | null;
  onPinClick: (photoId: string) => void;
}

// Cluster circle layer style
const clusterLayer: CircleLayer = {
  id: 'clusters',
  type: 'circle',
  source: 'photos',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': ['step', ['get', 'point_count'], '#3b82f6', 10, '#8b5cf6', 30, '#ec4899'],
    'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
  },
};

// Cluster count label layer style
const clusterCountLayer: SymbolLayer = {
  id: 'cluster-count',
  type: 'symbol',
  source: 'photos',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': '{point_count_abbreviated}',
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 12,
  },
  paint: {
    'text-color': '#ffffff',
  },
};

/**
 * Individual pin marker component
 */
const PhotoPin = React.memo(function PhotoPin({
  photo,
  isSelected,
  onClick,
}: {
  photo: PhotoListItemDto;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [lng, lat] = photo.location_public.coordinates;
  const isPhotographer = photo.user.role === 'photographer';

  return (
    <Marker
      longitude={lng}
      latitude={lat}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <button
        className={`group relative cursor-pointer transition-transform hover:scale-110 ${
          isSelected ? 'scale-125' : ''
        }`}
        aria-label={`Photo by ${photo.user.display_name}: ${photo.title}`}
        title={photo.title}
      >
        {/* Pin shadow */}
        <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-black/20 blur-sm" />

        {/* Pin marker */}
        <svg
          width="32"
          height="40"
          viewBox="0 0 32 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          <path
            d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z"
            fill={isPhotographer ? '#f59e0b' : '#3b82f6'}
            stroke="#ffffff"
            strokeWidth="2"
          />
          <circle
            cx="16"
            cy="16"
            r="6"
            fill="white"
            opacity={isSelected ? '1' : '0.9'}
          />
        </svg>

        {/* Selection ring */}
        {isSelected && (
          <div className="absolute left-1/2 top-3 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-primary/30" />
        )}
      </button>
    </Marker>
  );
});

/**
 * PinClusterLayer - Renders photo pins with clustering
 */
export function PinClusterLayer({ photos, selectedPhotoId, onPinClick }: PinClusterLayerProps) {
  // Convert photos to GeoJSON features
  const geojsonData = useMemo(() => {
    const pins = photosToPins(photos);

    return {
      type: 'FeatureCollection' as const,
      features: pins.map((pin) => ({
        type: 'Feature' as const,
        properties: {
          id: pin.id,
          isPhotographer: pin.isPhotographer,
          cluster: false,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: pin.coordinates,
        },
      })),
    };
  }, [photos]);

  const shouldCluster = photos.length > 50;

  // If clustering is not needed, render individual markers
  if (!shouldCluster) {
    return (
      <>
        {photos.map((photo) => (
          <PhotoPin
            key={photo.id}
            photo={photo}
            isSelected={photo.id === selectedPhotoId}
            onClick={() => onPinClick(photo.id)}
          />
        ))}
      </>
    );
  }

  // Render with clustering
  return (
    <>
      <Source
        id="photos"
        type="geojson"
        data={geojsonData}
        cluster={true}
        clusterMaxZoom={14}
        clusterRadius={50}
      >
        <Layer {...clusterLayer} />
        <Layer {...clusterCountLayer} />
      </Source>

      {/* Individual markers for unclustered points */}
      {photos.map((photo) => (
        <PhotoPin
          key={photo.id}
          photo={photo}
          isSelected={photo.id === selectedPhotoId}
          onClick={() => onPinClick(photo.id)}
        />
      ))}
    </>
  );
}

