import { NextResponse, type NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

const getToken = (request: NextRequest) => {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer (.+)$/i);
  return match?.[1];
};

const requireAuth = async (request: NextRequest) => {
  const adminAuth = getAdminAuth();
  if (!adminAuth) {
    return { ok: false, error: "Firebase Admin não configurado." };
  }
  const token = getToken(request);
  if (!token) {
    return { ok: false, error: "Token ausente." };
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { ok: true, decoded };
  } catch {
    return { ok: false, error: "Token inválido." };
  }
};

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return NextResponse.json(
        { error: "Firebase Admin não configurado." },
        { status: 500 }
      );
    }
    const list = await adminAuth.listUsers(1000);
    const adminDb = getAdminDb();
    const flags: Record<string, boolean> = {};
    if (adminDb && list.users.length > 0) {
      const refs = list.users.map((user) =>
        adminDb.collection("userFlags").doc(user.uid)
      );
      const snaps = await adminDb.getAll(...refs);
      snaps.forEach((snap) => {
        if (snap.exists) {
          flags[snap.id] = Boolean(snap.get("mustChangePassword"));
        }
      });
    }
    const users = list.users.map((user) => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      disabled: user.disabled,
      createdAt: user.metadata.creationTime,
      lastSignIn: user.metadata.lastSignInTime,
      providerData: user.providerData.map((provider) => provider.providerId),
      mustChangePassword: flags[user.uid] ?? false,
    }));
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: "Não foi possível carregar os usuários." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return NextResponse.json(
        { error: "Firebase Admin não configurado." },
        { status: 500 }
      );
    }
    const body = await request.json();
    const { email, password, displayName } = body || {};
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios." },
        { status: 400 }
      );
    }
    const user = await adminAuth.createUser({
      email,
      password,
      displayName,
    });
    const adminDb = getAdminDb();
    if (adminDb) {
      await adminDb
        .collection("userFlags")
        .doc(user.uid)
        .set(
          {
            uid: user.uid,
            email: user.email ?? email,
            displayName: user.displayName ?? displayName ?? "",
            mustChangePassword: true,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
    }
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: "Não foi possível criar o usuário." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return NextResponse.json(
        { error: "Firebase Admin não configurado." },
        { status: 500 }
      );
    }
    const body = await request.json();
    const { uid } = body || {};
    if (!uid) {
      return NextResponse.json(
        { error: "UID é obrigatório." },
        { status: 400 }
      );
    }
    await adminAuth.deleteUser(uid);
    const adminDb = getAdminDb();
    if (adminDb) {
      await adminDb.collection("userFlags").doc(uid).delete();
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Não foi possível excluir o usuário." },
      { status: 500 }
    );
  }
}
