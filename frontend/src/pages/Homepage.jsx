import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
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
import { io } from "socket.io-client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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
  const [myLocation, setMyLocation] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";
  const mapRef = useRef(null);
  const socketRef = useRef(null);

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

  useEffect(() => {
    if (!token) return;

    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });
    }
    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("receive-location", (data) => {
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u._id === data.userId);
        if (idx === -1) return prev;

        if (
          prev[idx].lat === data.lat &&
          prev[idx].lng === data.lng &&
          prev[idx].speed === data.speed
        ) {
          return prev;
        }

        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...data };
        return updated;
      });
    });

    socket.on("speed-alert", (alert) => {
      if (alert.message) window.alert(alert.message);
    });

    let lastSent = { lat: null, lng: null };
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        setMyLocation((prev) => {
          if (
            prev &&
            Math.abs(prev.lat - latitude) < 0.0001 &&
            Math.abs(prev.lng - longitude) < 0.0001
          ) {
            return prev;
          }
          return { lat: latitude, lng: longitude };
        });

         
          socket.emit("send-location", {
            userId: user.id,
            lat: latitude,
            lng: longitude,
            speed: speed ? speed * 3.6 : 0,
          });
          lastSent = { lat: latitude, lng: longitude };
        
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );

    return () => {
      socket.off("speed-alert");
      socket.off("receive-location");
      socket.emit("send-location");
      socket.disconnect();
      navigator.geolocation.clearWatch(watchId);
    };
  }, [token, user.id, SOCKET_URL]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }, [navigate]);

  const userMarkers = useMemo(
    () =>
      users
        .filter((u) => u.lastLat && u.lastLng)
        .map((u) => (
          <Marker
            key={u.id}
            position={[u.lastLat, u.lastLng]}
            icon={u.id === user.id ? myIcon : new L.Icon.Default()}
          >
            <Popup>
              <b>{u.name || "Unnamed"}</b>
              <br />
              🚗 {u.speed ?? 0} km/h
            </Popup>
          </Marker>
        )),
    [users, user.id]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-3 shadow-md bg-white dark:bg-gray-800 relative z-50">
        {/* <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen((prev) => !prev)}
        >
          <Menu className="h-6 w-6" />
        </Button> */}
        <div className="">Careio</div>

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
            center={myLocation ? [myLocation.lat, myLocation.lng] : [20, 77]}
            zoom={myLocation ? 13 : 5}
            style={{ height: "100%", width: "100%" }}
            whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {myLocation && (
              <Marker position={[myLocation.lat, myLocation.lng]} icon={myIcon}>
                <Popup>You are here 🚶‍♂️</Popup>
              </Marker>
            )}

            {userMarkers}
          </MapContainer>
        </div>
      </main>
    </div>
  );
}

export default Homepage;
