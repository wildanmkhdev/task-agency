import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const teams = await prisma.team.findMany({ select: { id: true, nama: true } });
  console.log("TEAMS:", JSON.stringify(teams));
  const penjoki = await prisma.penjoki.findMany({ select: { id: true, nama: true, teamId: true } });
  console.log("PENJOKI count:", penjoki.length);
  penjoki.forEach((p) => console.log(p.teamId, p.nama));
  const profiles = await prisma.profile.findMany({ select: { id: true, namaLengkap: true, role: true, teamId: true } });
  console.log("PROFILES:", JSON.stringify(profiles));
  const jenisTugas = await prisma.jenisTugas.findMany({ select: { id: true, nama: true } });
  console.log("JENIS TUGAS:", JSON.stringify(jenisTugas));
}
main().finally(() => prisma.$disconnect());
