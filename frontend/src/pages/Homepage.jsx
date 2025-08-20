import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  useContext,
} from "react";
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
  iconUrl: "/pin.png", // your Flaticon icon
  iconRetinaUrl: "pin.png", // same for retina
  shadowUrl: null, // no shadow
  iconSize: [50, 50], // adjust size (depends on image)
  iconAnchor: [17, 35], // bottom-center point
  popupAnchor: [0, -30], // popup above the icon
});
const flagIcon = new L.Icon({
  iconUrl: "/flag.png",
  iconRetinaUrl: "/flag.png",
  iconSize: [60, 60],
  iconAnchor: [30, 60],
  popupAnchor: [0, -50],
});


function HomePage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  console.log("User:", user);
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
  const [zoneRadius, setZoneRadius] = useState(100);
  const [zoneCenter, setZoneCenter] = useState(null);

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
        setUsers(await res.json());
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

  // Receive other users' locations
  useEffect(() => {
    if (!socket) return;
    const handleReceiveLocation = (data) => {
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.userId === data.userId);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            lastLat: data.lat,
            lastLng: data.lng,
            speed: data.speed,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              userId: data.userId,
              lastLat: data.lat,
              lastLng: data.lng,
              speed: data.speed,
              userName: data.userName || "Unnamed",
            },
          ];
        }
      });
    };
    socket.on("receive-location", handleReceiveLocation);
    return () => socket.off("receive-location", handleReceiveLocation);
  }, [socket]);

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
    navigate("/login");
  }, [navigate]);

  const handleCreateZone = async () => {
    if (!zoneName || !zoneRadius || !zoneCenter) {
      alert("Please enter zone name, radius, and select center on the map!");
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
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-3 shadow-md bg-white dark:bg-gray-800 relative z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen((prev) => !prev)}
        >
          <Menu className="h-6 w-6" />
        </Button> 
        <div className="">Careio</div>

        <div className="flex items-center gap-3">
          {/* Users Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
              >
                <Users className="h-4 w-4" /> Users
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 z-[9999]">
              {loadingUsers ? (
                <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
              ) : error ? (
                <DropdownMenuItem disabled>{error}</DropdownMenuItem>
              ) : users.length ? (
                users.map((u) => (
                  <DropdownMenuItem
                    key={u.userId}
                    className="flex flex-col items-start gap-1 py-2"
                    onClick={() =>
                      mapRef.current?.setView([u.lastLat, u.lastLng], 15, {
                        animate: true,
                      })
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {u.name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{u.name || "Unnamed"}</span>
                    </div>
                    {u.lastLat && u.lastLng && (
                      <span className="text-xs text-gray-500">
                        📍 {u.lastLat.toFixed(4)}, {u.lastLng.toFixed(4)}
                      </span>
                    )}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No users found</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Avatar className="h-9 w-9">
            <AvatarImage src="https://github.com/shadcn.png" alt="User" />
            <AvatarFallback>
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      {/* MAIN */}
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">
          Welcome {user?.name || "User"}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Live tracking with maps below.
        </p>

        {/* Zone Creation */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 mb-4">
          <Input
            placeholder="Zone Name"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
          />
          <Input
            type="number"
            placeholder="Radius (m)"
            value={zoneRadius}
            onChange={(e) => setZoneRadius(Number(e.target.value))}
          />
          <Button
            onClick={handleCreateZone}
            className="flex items-center gap-1"
          >
            <PlusCircle className="h-5 w-5" /> Add Zone
          </Button>
        </div>

        {/* Map */}
        <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-md relative z-10">
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
                    <b>{zoneName || "Selected Zone"}</b>
                    <br />
                    Center of the zone
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center animate-pulse">
              <p className="text-gray-600 dark:text-gray-300">
                Loading location...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default HomePage;
