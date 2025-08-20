import { useState } from "react";
import { Circle, useMap } from "react-leaflet";
import { Trash2, Edit } from "lucide-react";

export default function ZoneCircle({ zone, onDelete, onUpdate }) {
  const [cardPos, setCardPos] = useState(null);
  const map = useMap();

  const handleCircleClick = (e) => {
    e.originalEvent.preventDefault();
    const containerPoint = map.latLngToContainerPoint(e.latlng);
    setCardPos({ x: containerPoint.x, y: containerPoint.y });
  };

  const handleClose = () => setCardPos(null);

  return (
    <>
      {/* Zone circle */}
      <Circle
        center={[zone.center.lat, zone.center.lng]}
        radius={zone.radius}
        pathOptions={{ color: "blue", fillOpacity: 0.1, stroke: "#fff" }}
        eventHandlers={{ click: handleCircleClick }}
      />

      {/* Floating card */}
      {cardPos && (
        <div
          style={{
            position: "absolute",
            top: cardPos.y,
            left: cardPos.x,
            transform: "translate(-50%, -100%)",
            zIndex: 1000,
            minWidth: "200px",
          }}
          className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-blue-600">{zone.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Radius: {zone.radius} m
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Center: {zone.center.lat.toFixed(4)},{" "}
                {zone.center.lng.toFixed(4)}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                onDelete(zone._id);
                handleClose();
              }}
              className="flex items-center gap-1 px-4 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>
      )}
    </>
  );
}
