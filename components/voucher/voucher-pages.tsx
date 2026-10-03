import Image from "next/image";
import type { VoucherContent, VoucherPageIndex } from "@/lib/voucher";

type VoucherPagesProps = {
  content: VoucherContent;
  indices?: VoucherPageIndex[];
  interactivePreview?: boolean;
};

export function VoucherPages({ content, indices = [0, 1], interactivePreview = false }: VoucherPagesProps) {
  const selectedInclusions = [
    content.bbqDinner && "BBQ Dinner",
    content.candlelightDinner && "Candlelight dinner",
    content.flowerBed && "Flower bed decoration",
    content.floatingBreakfast && "Floating breakfast",
  ].filter((inclusion): inclusion is string => Boolean(inclusion));

  return (
    <div className="voucher-print-pages grid gap-4 sm:gap-6 lg:gap-8">
      {indices.map((index) => {
        const page = index === 0 ? "Front" : "Back";
        return (
          <article
            key={page}
            tabIndex={interactivePreview ? 0 : undefined}
            aria-label={interactivePreview ? `${page} voucher preview.` : `${page} voucher page`}
            className="voucher-print-page w-full min-w-0 overflow-hidden rounded-[9px] outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 sm:rounded-xl xl:rounded-[clamp(10px,1.5vw,20px)]"
          >
            <div className="voucher-canvas group relative aspect-[2100/990] w-full min-w-0 overflow-hidden rounded-[9px] bg-[linear-gradient(115deg,#141d1c_0%,#141f1e_50%,#121c1a_75%,#142421_100%)] shadow-[0_2px_3px_rgba(16,28,25,.1),0_10px_24px_rgba(16,28,25,.14)] [container-type:inline-size] after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_50%_40%,transparent_20%,rgba(3,10,8,.18)_100%)] after:content-[''] sm:rounded-xl xl:rounded-[clamp(10px,1.5vw,20px)] xl:shadow-[0_2px_4px_rgba(16,28,25,.12),0_24px_60px_rgba(16,28,25,.16)]">
              <Image className="absolute top-[-24.04%] left-[67.667%] z-10 h-[90.202%] w-[48.619%] origin-center rotate-150 object-contain" src="/spiral.svg" alt="" width={1021} height={893} priority={index === 0} />
              <Image className="absolute top-1/2 left-1/2 z-10 h-[90.202%] w-[48.619%] -translate-x-1/2 -translate-y-1/2 object-contain" src="/spiral.svg" alt="" width={1021} height={893} />
              <Image className="absolute top-[10.101%] left-[30.952%] z-20 h-[8.081%] w-[3.81%]" src="/dot.svg" alt="" width={80} height={80} />
              <Image className="absolute top-[20.202%] left-[28.571%] z-20 h-[3.03%] w-[1.429%]" src="/dot.svg" alt="" width={30} height={30} />
              {index === 0 && (
                <div className="absolute inset-y-[10.5%] left-[7.619%] z-20 flex w-[49.524%] flex-col justify-center text-[#beb16b]">
                  <p className="mb-[.6cqw] font-secondary text-[.65cqw] font-light tracking-[.24em]">A GIFT FOR YOU</p>
                  <h3 className="m-0 whitespace-pre-line font-primary text-[6.65cqw] leading-[.86] font-light tracking-[-.03em]">{content.frontTitle}</h3>
                  <div className="mt-[2.4cqw] h-px w-[38cqw] bg-[#beb16b]/40" />
                  <div className="mt-[1.5cqw] w-[83%]">
                    <p className="font-secondary text-[.62cqw] font-light tracking-[.22em]">MESSAGE</p>
                    <p className="mt-[.6cqw] whitespace-pre-line font-primary text-[1.05cqw] leading-[1.5] font-light tracking-[.005em]">{content.message.trim()}</p>
                    <p className="mt-[1.2cqw] font-secondary text-[.7cqw] font-medium tracking-[.12em]">{content.sender}</p>
                  </div>
                </div>
              )}
              {index === 1 && (
                <div className="absolute inset-x-[7.619%] top-[10.5%] bottom-[8.5%] z-20 flex flex-col text-[#beb16b]">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="mb-[.6cqw] font-secondary text-[.62cqw] font-light tracking-[.24em]">CHEMBARATHI · WAYANAD</p>
                      <h3 className="m-0 font-primary text-[5.15cqw] leading-[.82] font-light tracking-[-.035em]">{content.backTitle}</h3>
                    </div>
                    <div className="ml-[3.2cqw] pb-[.3cqw] text-right font-secondary">
                      <p className="text-[.52cqw] font-light tracking-[.22em]">VOUCHER NO.</p>
                      <p className="mt-[.3cqw] text-[.92cqw] font-semibold tracking-[.08em]">{content.voucherNumber || "—"}</p>
                    </div>
                  </div>
                  <div className="mt-[2.2cqw] h-px w-full bg-[#beb16b]/40" />
                  <div className="grid flex-1 grid-cols-[1fr_1px_1fr] items-center gap-[3.2cqw] py-[1.8cqw]">
                    <div>
                      <p className="font-secondary text-[.65cqw] font-light tracking-[.22em]">NAME</p>
                      <p className="mt-[.6cqw] font-primary text-[1.85cqw] leading-none font-light">{content.guestName}</p>
                      {content.voucherType === "dated" ? (
                        <div className="mt-[1.8cqw] grid grid-cols-2 gap-[2.4cqw]">
                          <div><p className="font-secondary text-[.58cqw] font-light tracking-[.2em]">CHECK-IN</p><p className="mt-[.5cqw] font-primary text-[1.02cqw] leading-none font-light whitespace-nowrap">{content.checkInDate}</p><p className="mt-[.5cqw] font-secondary text-[.58cqw] font-medium tracking-[.13em]">{content.checkInTime}</p></div>
                          <div><p className="font-secondary text-[.58cqw] font-light tracking-[.2em]">CHECK-OUT</p><p className="mt-[.5cqw] font-primary text-[1.02cqw] leading-none font-light whitespace-nowrap">{content.checkOutDate}</p><p className="mt-[.5cqw] font-secondary text-[.58cqw] font-medium tracking-[.13em]">{content.checkOutTime}</p></div>
                        </div>
                      ) : (
                        <div className="mt-[1.8cqw]"><p className="font-secondary text-[.58cqw] font-light tracking-[.2em]">REDEEM BEFORE</p><p className="mt-[.6cqw] font-primary text-[1.65cqw] leading-none font-light">{content.redeemDate}</p></div>
                      )}
                    </div>
                    <div className="h-[11.8cqw] w-px justify-self-center bg-[#beb16b]/25" />
                    <div>
                      <p className="font-secondary text-[.65cqw] font-light tracking-[.22em]">COTTAGE</p>
                      <p className="mt-[.6cqw] max-w-[31cqw] font-primary text-[1.7cqw] leading-[1.12] font-light tracking-[.01em]">{content.villaType}</p>
                      {selectedInclusions.length > 0 && (
                        <div className="mt-[1.5cqw]">
                          <p className="font-secondary text-[.58cqw] font-light tracking-[.2em]">INCLUSIONS</p>
                          <ul className="mt-[.5cqw] grid grid-cols-2 gap-x-[1.6cqw] gap-y-[.4cqw] font-primary text-[.95cqw] leading-[1.25] font-light">
                            {selectedInclusions.map((inclusion) => <li key={inclusion} className="flex items-baseline gap-[.5cqw]"><span aria-hidden="true" className="text-[.72em]">•</span><span>{inclusion}</span></li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-[#beb16b]/40 pt-[1.2cqw]">
                    <div className="grid grid-cols-[4.2cqw_1fr_auto] items-center gap-[1.8cqw]">
                      <Image className="h-auto w-[4.2cqw] object-contain" src="/logo.svg" alt="" width={340} height={296} />
                      <p className="font-primary text-[.9cqw] leading-[1.55] font-light">{content.address}</p>
                      <p className="font-primary text-right text-[.8cqw] leading-[1.65] tracking-[.02em] whitespace-nowrap">{content.phone}<br />{content.email}</p>
                    </div>
                  </div>
                </div>
              )}
              {index === 0 && <Image className="absolute top-1/2 left-[79.048%] z-20 h-[29.899%] w-[16.19%] -translate-y-1/2 object-contain" src="/logo.svg" alt="" width={340} height={296} />}
            </div>
          </article>
        );
      })}
    </div>
  );
}
