"use client";

import { PlainPageLayout } from "@/components/layouts/PlainPageLayout";
import { Text } from "@/components/ui/Text";
import { AttesterAvatar } from "@/components/single-package/SinglePackageTrustSignals";
import { allTrustedAttestors, type TrustedAttestor } from "@/lib/attestations";
import { beautifySuiAddress } from "@/lib/utils";

export default function TrustedAttestorsPage() {
  const attestors = allTrustedAttestors();

  return (
    <PlainPageLayout>
      <div className="flex flex-col gap-lg py-lg">
        <div className="flex flex-col gap-xs">
          <Text kind="heading" size="heading-regular">
            Trusted attestors
          </Text>
          <Text
            as="p"
            kind="paragraph"
            size="paragraph-small"
            className="max-w-2xl text-content-secondary"
          >
            Attestations are surfaced only from this curated set of attesters.
            Trust is a consumer-side choice — these are the packages MVR
            recognizes as authoritative sources of audits and vulnerability
            disclosures.
          </Text>
        </div>

        {attestors.length === 0 ? (
          <Text as="p" kind="paragraph" size="paragraph-small">
            No trusted attestors are configured.
          </Text>
        ) : (
          <div className="flex flex-col gap-sm">
            {attestors.map((a) => (
              <AttestorCard key={a.originalId} attestor={a} />
            ))}
          </div>
        )}
      </div>
    </PlainPageLayout>
  );
}

function AttestorCard({ attestor }: { attestor: TrustedAttestor }) {
  return (
    <div className="flex items-center gap-md rounded-md bg-bg-secondary p-md">
      <AttesterAvatar attestor={attestor} size="lg" />
      <div className="flex flex-col gap-2xs">
        <Text kind="label" size="label-regular">
          {attestor.name}
        </Text>
        {attestor.mvrName ? (
          <a
            href={`/package/${attestor.mvrName}`}
            className="text-content-accent underline w-fit"
          >
            <Text kind="paragraph" size="paragraph-xs">
              {attestor.mvrName}
            </Text>
          </a>
        ) : (
          <Text
            as="p"
            kind="paragraph"
            size="paragraph-xs"
            className="font-mono opacity-60"
          >
            {beautifySuiAddress(attestor.originalId)}
          </Text>
        )}
      </div>
    </div>
  );
}
