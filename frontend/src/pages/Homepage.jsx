import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  useContext,
} from "react";
import { Menu, LogOut, Users } from "lucide-react";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useNavigate } from "react-router";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { SocketContext } from "../context/socket.context";

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

  const [users, setUsers] = useState([]);
  const [myLocation, setMyLocation] = useState({
    latitude: 0,
    longitude: 0,
    speed: 0,
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const mapRef = useRef(null);
  const { socket } = useContext(SocketContext);

  // Fetch users once
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await fetch(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch users");

        const data = await res.json();
        setUsers(data || []);
        setError(null);
      } catch (err) {
        console.error("Fetch users error:", err);
        setError("Failed to load users.");
        setUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (token) fetchUsers();
    else navigate("/login");
  }, [token, API_URL, navigate]);

  // Send my location every 10s
  useEffect(() => {
    const updateLocation = () => {
      if (navigator.geolocation && socket) {
        navigator.geolocation.getCurrentPosition((position) => {
          const locData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed ? position.coords.speed * 3.6 : 0,
          };
          setMyLocation(locData);

          socket.emit("send-location", {
            userId: user.id,
            lat: locData.latitude,
            lng: locData.longitude,
            speed: locData.speed,
          });
        });
      }
    };

    updateLocation();
    const interval = setInterval(updateLocation, 10000);
    return () => clearInterval(interval);
  }, [socket, user.id]);

  // Receive locations from server
  useEffect(() => {
    if (!socket) return;

    const handleReceiveLocation = (data) => {
      setUsers((prevUsers) => {
        const idx = prevUsers.findIndex((u) => u.userId === data.userId);
        if (idx !== -1) {
          const updated = [...prevUsers];
          updated[idx] = {
            ...updated[idx],
            lastLat: data.lat,
            lastLng: data.lng,
            speed: data.speed,
          };
          return updated;
        } else {
          return [
            ...prevUsers,
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

  // Speed alert
  useEffect(() => {
    if (!socket) return;
    const handleSpeedAlert = (alert) => {
      if (alert.message) window.alert(alert.message);
    };
    socket.on("speed-alert", handleSpeedAlert);
    return () => socket.off("speed-alert", handleSpeedAlert);
  }, [socket]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }, [navigate]);

  const userMarkers = useMemo(() => {
    return users
      .filter((u) => u.lastLat && u.lastLng)
      .map((u) => (
        <Marker
          key={u.userId}
          position={[u.lastLat, u.lastLng]}
          icon={u.userId === user.id ? myIcon : new L.Icon.Default()}
        >
          <Popup>
            <b>{u.userName || "Unnamed"}</b>
            <br />
            🚗 {u.speed ?? 0} km/h
          </Popup>
        </Marker>
      ));
  }, [users, user.id]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-3 shadow-md bg-white dark:bg-gray-800 relative z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen((prev) => !prev)}
        >
          <Menu className="h-6 w-6" />
        </Button>

        <div className="flex items-center gap-3">
          {/* User dropdown */}
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
            <DropdownMenuContent className="w-64 z-[9999] relative">
              {loadingUsers ? (
                <DropdownMenuItem disabled>Loading users...</DropdownMenuItem>
              ) : error ? (
                <DropdownMenuItem disabled>{error}</DropdownMenuItem>
              ) : users.length > 0 ? (
                users.map((u) => (
                  <DropdownMenuItem
                    key={u.userId}
                    className="flex flex-col items-start gap-1 py-2"
                    onClick={() => {
                      if (u.lastLat && u.lastLng && mapRef.current) {
                        mapRef.current.setView([u.lastLat, u.lastLng], 15, {
                          animate: true,
                        });
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {u.userName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{u.userName || "Unnamed"}</span>
                    </div>
                    {u.lastLat && u.lastLng ? (
                      <span className="text-xs text-gray-500">
                        📍 {u.lastLat.toFixed(4)}, {u.lastLng.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        No location
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

      {/* MAIN */}
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">
          Welcome {user?.name ? user.name : "User"}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Live tracking with maps below.
        </p>

        <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-md relative z-10">
          <MapContainer
            center={[myLocation.latitude, myLocation.longitude]}
            zoom={16}
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
            whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
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
          </MapContainer>
        </div>
      </main>
    </div>
  );
}

export default Homepage;
