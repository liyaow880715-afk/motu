"use client";

import { useState } from "react";
import { Save, Palette } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBrandStore } from "@/hooks/use-brand-store";

export function BrandSettings() {
  const { brandName, companyName, version, setBrandName, setCompanyName, setVersion } = useBrandStore();
  const [form, setForm] = useState({ brandName, companyName, version });

  const handleSave = () => {
    setBrandName(form.brandName.trim() || "摹图");
    setCompanyName(form.companyName.trim() || "零禾（上海）网络科技有限公司");
    setVersion(form.version.trim() || "V1");
    toast.success("品牌信息已保存");
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-medium">品牌与作者信息</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          自定义显示在左侧栏底部的品牌名称、公司名称和版本号。
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs">品牌名称</Label>
            <Input
              value={form.brandName}
              onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
              placeholder="例如：摹图"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">公司名称 / 作者</Label>
            <Input
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              placeholder="例如：零禾（上海）网络科技有限公司"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">版本号</Label>
            <Input
              value={form.version}
              onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              placeholder="例如：V1"
              className="h-10"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="h-10 gap-2 rounded-2xl">
            <Save className="h-4 w-4" />
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
