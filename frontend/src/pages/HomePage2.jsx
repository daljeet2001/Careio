import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  useContext,
} from "react";
import { toast } from "react-hot-toast";

import { Menu, LogOut, Users, PlusCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { useNavigate } from "react-router";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { SocketContext } from "../context/socket.context";

// Remove Leaflet's default _getIconUrl method
delete L.Icon.Default.prototype._getIconUrl;

// Override global defaults
L.Icon.Default.mergeOptions({
  iconUrl: "/pin2.png", // your Flaticon icon
  iconRetinaUrl: "pin2.png", // same for retina
  shadowUrl: null, // no shadow
  iconSize: [30, 30], // adjust size (depends on image)
  iconAnchor: [17, 35], // bottom-center point
  popupAnchor: [0, -30], // popup above the icon
});
const flagIcon = new L.Icon({
  iconUrl: "/pin.png",
  iconRetinaUrl: "/pin.png",
  iconSize: [30, 30],
  iconAnchor: [30, 60],
  popupAnchor: [0, -50],
});


function HomePage2() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
//   console.log("User:", user);
  const token = localStorage.getItem("token");

  const [users, setUsers] = useState([]);
  const [myLocation, setMyLocation] = useState({
    latitude: 0,
    longitude: 0,
    speed: 0,
  });
  const [zones, setZones] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneRadius, setZoneRadius] = useState();
  const [zoneCenter, setZoneCenter] = useState(null);
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const [zonesDropdownOpen, setZonesDropdownOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const mapRef = useRef(null);
  const { socket } = useContext(SocketContext);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await fetch(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch users");
        const data= await res.json();
        console.log("Fetched users:", data);
     
        setUsers(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load users.");
      } finally {
        setLoadingUsers(false);
      }
    };
    if (token) fetchUsers();
    else navigate("/login");
    // Poll every 5 seconds
  const intervalId = setInterval(fetchUsers, 5000);
  

  // Cleanup on unmount
  return () => clearInterval(intervalId);
  }, [token, API_URL, navigate]);

  // Fetch zones
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await fetch(`${API_URL}/safezone`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch zones");
        setZones(await res.json());
      } catch (err) {
        console.error(err);
      }
    };
    if (token) fetchZones();
  }, [token, API_URL]);

  // Update user location
  useEffect(() => {
    const updateLocation = () => {
      if (navigator.geolocation && socket) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const locData = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            speed: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
          };
          setMyLocation(locData);
          socket.emit("send-location", {
            userId: user.id,
            lat: locData.latitude,
            lng: locData.longitude,
            speed: locData.speed,
          });
          // console.log("Location updated:", locData);
        });
      }
    };
    updateLocation();
    const interval = setInterval(updateLocation, 1000);
    return () => clearInterval(interval);
  }, [socket, user.id]);

  // Update  users' locations
//   useEffect(() => {
//     if (!socket) return;
//     const handleReceiveLocation = (data) => {
//       setUsers((prev) => {
//         const idx = prev.findIndex((u) => u.userId === data.userId);
//         if (idx !== -1) {
//           const updated = [...prev];
//           updated[idx] = {
//             ...updated[idx],
//             lastLat: data.lat,
//             lastLng: data.lng,
//             speed: data.speed,
//           };
//           return updated;
//         } else {
//           return [
//             ...prev,
//             {
//               userId: data.userId,
//               lastLat: data.lat,
//               lastLng: data.lng,
//               speed: data.speed,
//               userName: data.userName || "Unnamed",
//             },
//           ];
//         }
//       });
//     };
//     socket.on("receive-location", handleReceiveLocation);
//     console.log("upadted users:", users);
//     return () => socket.off("receive-location", handleReceiveLocation);
//   }, [socket]);

  // useEffect(() => {
  //   if (!socket) return;
  //   const handleSpeedAlert = (alert) =>
  //     alert.message && window.alert(alert.message);
  //   socket.on("speed-alert", handleSpeedAlert);
  //   return () => socket.off("speed-alert", handleSpeedAlert);
  // }, [socket]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }, [navigate]);

  const handleCreateZone = async () => {
    if (!zoneName || !zoneRadius || !zoneCenter) {
//     toast.error("Please enter zone name, radius, and select center on the map", {
//   icon: "⚠️", // your icon or emoji
// });
showDangerToast();
     return;
    }
    
    try {
      const res = await fetch(`${API_URL}/safezone/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: zoneName,
          center: zoneCenter,
          radius: zoneRadius,
        }),
      });
      if (!res.ok) throw new Error("Failed to create zone");
      const newZone = await res.json();
      setZones((prev) => [...prev, newZone]);
      setZoneName("");
      setZoneRadius(100);
      setZoneCenter(null);
    } catch (err) {
      console.error(err.message);
    }
  };

const userMarkers = useMemo(
  () =>
    users
      .filter(
        (u) => u.lastLat && u.lastLng && u.userId !== user.id // exclude logged-in user
      )
      .map((u) => (
        <Marker key={u.userId} position={[u.lastLat, u.lastLng]}>
          <Popup>
            <b className="font-bebas">{u.name || "Unnamed"}</b>
          </Popup>
        </Marker>
      )),
  [users, user.id]
);


  // Component to handle map clicks for zone center
  function ZoneMarkerSetter() {
    useMapEvents({
      click(e) {
        setZoneCenter({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return null;
  }

 

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* NAVBAR */}
    <nav className="w-full px-6 py-4 flex bg-none items-center justify-between fixed z-20">
      {/* Brand */}
      <div className="text-4xl pl-12 text-black  font-bebas tracking-wide cursor-pointer">
        Careio
      </div>

      {/* Right side */}
      
        <div className="flex items-center  relative">

    

          {/* Users Dropdown Trigger */}
          <button
            className="flex items-center gap-1 px-3 py-1 font-bebas  text-black "
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
             Track
          </button>


 {/* Zones Dropdown */}
<div className="relative">
  <button
    onClick={() => setZonesDropdownOpen(!zonesDropdownOpen)}
    className="flex items-center gap-1 px-3 py-1 font-bebas text-black"
  >
    Zones
  </button>

{zonesDropdownOpen && (
  <div className="absolute right-0 mt-4 w-64 bg-white border border-gray-200 rounded-md  z-50 p-4 cursor-pointer">
    <div className="flex justify-end mb-2">
      <button
        onClick={() => setZonesDropdownOpen(false)}
        className="text-gray-500 hover:text-gray-700 transition text-sm"
      >
        ✕
      </button>
    </div>

    {zones.length ? (
        console.log("Zones:", zones),
      zones.map((zone) => (
        <div
          key={zone.id}
          className="px-2 py-1 flex flex-col gap-1 hover:rounded-md  hover:border hover:border-gray-300 transition-all"
                  onClick={() => {
                // Zoom to zone on map
                if (zone.center.lat && zone.center.lng) {
                  mapRef.current?.setView([zone.center.lat, zone.center.lng], 15, { animate: true });
                }
              }}
        >
          <div className="flex justify-between items-center">
            <div
              className="flex flex-col"
    
            >
              <span className="font-bebas font-medium">{zone.name}</span>
              <span className="text-xs text-gray-500 font-bebas">{zone.radius}m radius</span>
            </div>

            <button
              onClick={async (e) => {
                e.stopPropagation(); // Prevent zoom on map
                try {
                  const res = await fetch(`${API_URL}/${zone._id}`, {
                    method: "DELETE",
                    headers: {
                      "Content-Type": "application/json",
                      // Add auth token if needed
                      Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                  });
                  if (!res.ok) throw new Error("Failed to delete zone");
                  // Remove zone from state
                  setZones((prev) => prev.filter((z) => z.id !== zone.id));
                } catch (err) {
                  console.error(err);
                }
              }}
              className="text-red-500 hover:text-red-700 text-xs transition ml-2  cursor-progress"
            >
              Delete
            </button>
          </div>
        </div>
      ))
    ) : (
      <div className="px-2 py-1 text-sm font-bebas text-gray-500">No zones found</div>
    )}
  </div>
)}

</div>


   
  {/* Add Zone Dropdown */}
          <div className="relative">
            <button
              onClick={() => setZoneDropdownOpen(!zoneDropdownOpen)}
              className="flex items-center gap-1 px-3 py-1 font-bebas text-black"
            >
              Add Zone
            </button>

            {zoneDropdownOpen && (
              <div className="absolute right-0 mt-4 w-64 bg-white border border-gray-200 rounded-md z-50 p-4">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setZoneDropdownOpen(false)}
                    className="text-gray-500 hover:text-gray-700 transition"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Zone Name"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 font-bebas rounded-md mb-2"
                />
                <input
                  type="number"
                  placeholder="Radius (meters)"
                  value={zoneRadius}
                  onChange={(e) => setZoneRadius(Number(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 rounded-md mb-2 font-bebas"
                />
                <button
                  onClick={() => {
                    handleCreateZone(zoneName, zoneRadius);
                    setZoneDropdownOpen(false);
                    setZoneName("");
                    setZoneRadius("");
                  }}
                  className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-black font-bebas text-white rounded-md "
                >
                  Add Zone
                </button>
              </div>
            )}
          </div>

          {/* Users Dropdown Menu */}
{dropdownOpen && (
  <div className="absolute right-0 top-12 w-64 bg-white border border-gray-200 rounded-md  z-50 p-4">
    {/* Close Button */}
    <div className="flex justify-end mb-2">
      <button
        onClick={() => setDropdownOpen(false)}
        className="text-gray-500 hover:text-gray-700 transition text-sm"
      >
        ✕
      </button>
    </div>

    {loadingUsers ? (
      <div className="px-2 py-1 text-sm text-gray-500 font-bebas">Loading...</div>
    ) : error ? (
      <div className="px-2 py-1 text-sm font-bebas text-red-500">{error}</div>
    ) : users.length ? (
      users.map((u) => (
        <div
          key={u.userId}
          className="px-2 py-1 flex flex-col gap-1 hover:rounded-md cursor-pointer hover:border hover:border-gray-300 transition-all"
          onClick={() =>
            mapRef.current?.setView([u.lastLat, u.lastLng], 15, { animate: true })
          }
        >
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-white">
              {u.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="font-bebas">{u.name || "Unnamed"}</span>
          </div>
          {u.lastLat && u.lastLng && (
            <span className="text-xs text-gray-500">
              📍 {u.lastLat.toFixed(4)}, {u.lastLng.toFixed(4)}
            </span>
          )}
        </div>
      ))
    ) : (
      <div className="px-2 py-1 text-sm font-bebas text-gray-500">No users found</div>
    )}
  </div>
)}


       


      

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1 font-bebas text-black"
          >
         Logout
          </button>

       
        </div>
     
    </nav>
      

      {/* MAIN */}
      <main className=" space-y-4">

        {/* Map */}
        <div className="w-screen h-screen overflow-hidden relative z-10">
          {myLocation.latitude ? (
            <MapContainer
              center={[myLocation.latitude, myLocation.longitude]}
              zoom={16}
              style={{ height: "100%", width: "100%" }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* <Marker
                position={[myLocation.latitude, myLocation.longitude]}
             
              >
                <Popup><span className="font-bebas">You</span></Popup>
              </Marker> */}

              {userMarkers}

              {zones.map((zone) => (
                <Circle
                  key={zone._id}
                  center={[zone.center.lat, zone.center.lng]}
                  radius={zone.radius}
                  pathOptions={{
                    color: "black",
                    fillOpacity: 0.1,
                    weight: 1,
                  }}
                >
                  <Popup>
                    <b className="font-bebas">{zone.name} Zone</b>
                    <br />
                    <span className="font-bebas">{zone.radius} m</span>
                  </Popup>
                </Circle>
              ))}

              {/* Zone selection */}
              <ZoneMarkerSetter />

              {/* Preview selected zone center */}
              {zoneCenter && (
                <Marker position={[zoneCenter.lat, zoneCenter.lng]} icon={flagIcon}>
                  <Popup>
                    <b className="font-bebas">{zoneName || "Selected Zone"}</b>
                    <br />
                
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center animate-pulse">
              <p className="text-gray-600 dark:text-gray-300 font-bebas text-lg">
                Loading location...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default HomePage2;


const showDangerToast = () => {
  toast.custom(
    (t) => (
      <div
        className="flex items-center p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
        role="alert"
      >
        <svg
          className="shrink-0 inline w-4 h-4 mr-3"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
        </svg>
        <span className="sr-only">Info</span>
        <div>
          <span className="font-medium"></span> Please select center on the map.
        </div>
      </div>
    ),
    { duration: 4000 } // toast duration in ms
  );
};