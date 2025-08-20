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
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { SocketContext } from "../context/socket.context";
import ZoneCircle from "../components/Zone";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const myIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

function Homepage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const { socket } = useContext(SocketContext);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const mapRef = useRef(null);

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
  const [createZone, setCreateZone] = useState(false);

  const defaultIcon = useMemo(() => new L.Icon.Default(), []);

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

  useEffect(() => {
    if (!socket || !navigator.geolocation) return;

    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition((pos) => {
        const locData = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
        };

        if (
          locData.latitude !== myLocation.latitude ||
          locData.longitude !== myLocation.longitude
        ) {
          setMyLocation(locData);
          socket.emit("send-location", {
            userId: user.id,
            lat: locData.latitude,
            lng: locData.longitude,
            speed: locData.speed,
          });
        }
      });
    };

    updateLocation();
    const interval = setInterval(updateLocation, 3000);
    return () => clearInterval(interval);
  }, [socket, user.id, myLocation.latitude, myLocation.longitude]);

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

  const userMarkers = useMemo(() => {
    return users
      .filter((u) => u.lastLat && u.lastLng)
      .map((u) => (
        <Marker
          key={u.userId}
          position={[u.lastLat, u.lastLng]}
          icon={u.userId === user.id ? myIcon : defaultIcon}
        >
          <Popup>
            <b>{u.userName || "Unnamed"}</b>
            <br />
            {u.userId === user.id
              ? "You are here 🚶‍♂️"
              : `🚗 ${u.speed ?? 0} km/h`}
          </Popup>
        </Marker>
      ));
  }, [users, user.id, defaultIcon]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }, [navigate]);

  const handleCreateZone = async () => {
    if (!zoneName || !zoneRadius || !zoneCenter) {
      alert("Enter zone name, radius, and select center!");
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
      setCreateZone(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteZone = async (zoneId) => {
    try {
      const res = await fetch(`${API_URL}/safezone/${zoneId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete zone");
      setZones((prev) => prev.filter((z) => z._id !== zoneId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateZone = async (zone) => {
    try {
      const res = await fetch(`${API_URL}/safezone/${zone._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(zone),
      });
      if (!res.ok) throw new Error("Failed to update zone");
      setZones((prev) => prev.map((z) => (z._id === zone._id ? zone : z)));
    } catch (err) {
      console.error(err);
    }
  };

  function ZoneMarkerSetter() {
    useMapEvents({
      click(e) {
        if (createZone) setZoneCenter({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="flex items-center justify-between px-4 py-3 shadow-md bg-white dark:bg-gray-800">
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-3">
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
                    <span className="text-xs text-gray-400">{u.email}</span>
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

      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">
          Welcome {user?.name || "User"}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Live tracking with maps below.
        </p>

        <div className="mb-4 flex items-center w-full gap-2">
          {!createZone ? (
            <Button
              onClick={() => setCreateZone(true)}
              className="flex items-center gap-1"
              variant="outline"
            >
              <PlusCircle className="h-5 w-5" /> Create Zone
            </Button>
          ) : (
            <div className="flex flex-col mx-auto container max-w-2xl md:flex-row items-start md:items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md w-full">
              <Input
                placeholder="Zone Name"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                placeholder="Radius (m)"
                value={zoneRadius}
                onChange={(e) => setZoneRadius(Number(e.target.value))}
                className="w-24"
              />
              <div className="flex gap-1">
                <Button
                  onClick={handleCreateZone}
                  className="flex items-center gap-1"
                >
                  <PlusCircle className="h-5 w-5" /> Add
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setCreateZone(false);
                    setZoneName("");
                    setZoneRadius(100);
                    setZoneCenter(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 md:mt-0">
                Click on the map to select center
              </p>
            </div>
          )}
        </div>

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

              <Marker
                position={[myLocation.latitude, myLocation.longitude]}
                icon={myIcon}
              >
                <Popup>You are here 🚶‍♂️</Popup>
              </Marker>

              {userMarkers}

              {zones.map((zone) => (
                <ZoneCircle
                  key={zone._id}
                  zone={zone}
                  onDelete={handleDeleteZone}
                  onUpdate={handleUpdateZone}
                />
              ))}

              {createZone && zoneCenter && (
                <Marker position={[zoneCenter.lat, zoneCenter.lng]}>
                  <Popup>Selected Center</Popup>
                </Marker>
              )}

              {createZone && <ZoneMarkerSetter />}
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

export default Homepage;
