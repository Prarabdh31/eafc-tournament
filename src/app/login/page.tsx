import { signIn } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WcBlobField } from "@/components/wc/blob-field";
import { AppBrand } from "@/components/wc/brand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="wc-gradient-bg relative flex min-h-screen items-center justify-center p-4">
      <WcBlobField />
      <Card className="wc-card animate-in fade-in-0 zoom-in-95 relative w-full max-w-sm text-white duration-500">
        <CardHeader className="items-center space-y-3">
          <AppBrand size="lg" />
          <CardTitle className="text-center text-lg tracking-tight text-white/80">
            Tournament Director Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={signIn} className="space-y-4">
            <input type="hidden" name="redirect" value={params.redirect ?? "/admin"} />
            {params.error && (
              <Alert variant="destructive">
                <AlertDescription>{params.error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full" size="lg">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
