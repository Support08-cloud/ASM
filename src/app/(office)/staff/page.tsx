"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Banner, Badge, Button, Card, Field, Input, Select } from "@/components/ui";

type StaffUser = {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "STAFF";
  phone: string | null;
  isActive: boolean;
};

export default function StaffPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STAFF");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api<{ users: StaffUser[] }>("/api/users");
    setUsers(data.users);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Admin only"));
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/users", {
        method: "POST",
        body: JSON.stringify({ name, username, password, role }),
      });
      setName("");
      setUsername("");
      setPassword("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create login");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(user: StaffUser) {
    await api("/api/users", {
      method: "PATCH",
      body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
    });
    await load();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold">Staff logins</h2>
        <p className="text-sm text-stone">Reception and other desks can register employees and give upad. Only admin can add these accounts.</p>
      </div>
      {error ? <Banner kind="error">{error}</Banner> : null}
      <Card>
        <form onSubmit={createUser} className="grid gap-3 md:grid-cols-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </Field>
          <Field label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="STAFF">Reception / Staff</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </Field>
          <Button type="submit" disabled={busy} className="md:col-span-4">
            Add login
          </Button>
        </form>
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-ink text-white">
            <tr className="text-left text-[11px] uppercase tracking-wider">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{user.name}</td>
                <td className="px-4 py-3">{user.username}</td>
                <td className="px-4 py-3">{user.role === "ADMIN" ? "Admin" : "Staff"}</td>
                <td className="px-4 py-3">
                  <Badge tone={user.isActive ? "ok" : "stone"}>{user.isActive ? "Active" : "Off"}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" onClick={() => toggle(user)}>
                    {user.isActive ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
