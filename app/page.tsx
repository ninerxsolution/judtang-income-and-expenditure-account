/**
 * Home (public). Overview of the project and entry points.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Home | Judtang",
};

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">
            Judtang Income and Expenditure Account
          </CardTitle>
          <CardDescription>
            ระบบจัดการบัญชีรายรับ–รายจ่าย และฐานสำหรับทีมที่ต้องการระบบล็อกอินและบันทึกกิจกรรม
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            โปรเจกต์นี้ให้บริการ Authentication (ลงทะเบียน/เข้าสู่ระบบด้วยอีเมลหรือ Google)
            และ Activity Log สำหรับตรวจสอบเหตุการณ์สำคัญ เช่น การล็อกอิน ล็อกเอาท์
            และการเปลี่ยนโปรไฟล์ สร้างด้วย Next.js, NextAuth และ MySQL
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild>
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard (protected)</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
