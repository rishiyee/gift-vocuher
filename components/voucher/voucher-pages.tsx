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
    <div className="voucher-print-pages grid gap-6 sm:gap-8 lg:gap-10">
      {indices.map((index) => {
        const page = index === 0 ? "Front" : "Back";
        return (
          <article
            key={page}
            tabIndex={interactivePreview ? 0 : undefined}
            aria-label={interactivePreview ? `${page} voucher preview. Scroll horizontally on smaller screens.` : `${page} voucher page`}
            className="voucher-print-page mx-0 overflow-x-auto px-0 pb-3 outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 sm:-mx-5 sm:px-5 lg:-mx-6 lg:px-6 xl:mx-0 xl:overflow-visible xl:px-0 xl:pb-0"
          >
            <div className="voucher-canvas group relative aspect-[2100/990] w-full min-w-[840px] overflow-hidden rounded-[9px] bg-[linear-gradient(115deg,#141d1c_0%,#141f1e_50%,#121c1a_75%,#142421_100%)] shadow-[0_2px_3px_rgba(16,28,25,.1),0_14px_32px_rgba(16,28,25,.14)] [container-type:inline-size] after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_50%_40%,transparent_20%,rgba(3,10,8,.18)_100%)] after:content-[''] xl:min-w-0 xl:rounded-[clamp(10px,1.5vw,20px)] xl:shadow-[0_2px_4px_rgba(16,28,25,.12),0_24px_60px_rgba(16,28,25,.16)]">
              <Image className="absolute top-[-24.04%] left-[67.667%] z-10 h-[90.202%] w-[48.619%] origin-center rotate-150 object-contain" src="/spiral.svg" alt="" width={1021} height={893} priority={index === 0} />
              <Image className="absolute top-1/2 left-1/2 z-10 h-[90.202%] w-[48.619%] -translate-x-1/2 -translate-y-1/2 object-contain" src="/spiral.svg" alt="" width={1021} height={893} />
              <Image className="absolute top-[10.101%] left-[30.952%] z-20 h-[8.081%] w-[3.81%]" src="/dot.svg" alt="" width={80} height={80} />
              <Image className="absolute top-[20.202%] left-[28.571%] z-20 h-[3.03%] w-[1.429%]" src="/dot.svg" alt="" width={30} height={30} />
              {index === 0 && (
                <div className="absolute top-1/2 left-[7.619%] z-20 w-[49.524%] -translate-y-1/2 text-[#beb16b]">
                  <p className="mb-[.8cqw] font-secondary text-[.65cqw] font-light tracking-[.24em]">A GIFT FOR YOU</p>
                  <h3 className="m-0 whitespace-pre-line font-primary text-[6.65cqw] leading-[.86] font-light tracking-[-.03em]">{content.frontTitle}</h3>
                  <div className="mt-[3.3cqw] h-px w-[38cqw] bg-[#beb16b]/40" />
                  <div className="mt-[1.8cqw] w-[83%]">
                    <p className="font-secondary text-[.62cqw] font-light tracking-[.22em]">MESSAGE</p>
                    <p className="mt-[.9cqw] whitespace-pre-line font-primary text-[1.05cqw] leading-[1.5] font-light tracking-[.005em]">{content.message.trim()}</p>
                    <p className="mt-[1.35cqw] font-secondary text-[.7cqw] font-medium tracking-[.12em]">{content.sender}</p>
                  </div>
                </div>
              )}
              {index === 1 && (
                <div className="absolute inset-x-[7.619%] top-[11.5%] bottom-[9%] z-20 flex flex-col text-[#beb16b]">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="mb-[.7cqw] font-secondary text-[.62cqw] font-light tracking-[.24em]">CHEMBARATHI · WAYANAD</p>
                      <h3 className="m-0 font-primary text-[5.15cqw] leading-[.82] font-light tracking-[-.035em]">{content.backTitle}</h3>
                    </div>
                    <p className="ml-auto pb-[.3cqw] text-right font-secondary text-[.84cqw] font-medium tracking-[.1em] whitespace-nowrap">{content.villaType}</p>
                  </div>
                  <div className="mt-[2.4cqw] h-px w-full bg-[#beb16b]/40" />
                  <div className={selectedInclusions.length ? "grid flex-1 grid-cols-[1fr_1px_1fr] items-center gap-[4.3cqw]" : "grid flex-1 grid-cols-1 items-center"}>
                    {selectedInclusions.length > 0 && (
                      <div className="order-3">
                        <p className="font-secondary text-[.65cqw] font-light tracking-[.22em]">DETAILS</p>
                        <ul className="mt-[1cqw] grid gap-[.35cqw] font-primary text-[1.22cqw] leading-[1.3] font-light">
                          {selectedInclusions.map((inclusion) => <li key={inclusion} className="flex items-baseline gap-[.65cqw]"><span aria-hidden="true" className="text-[.72em]">•</span><span>{inclusion}</span></li>)}
                        </ul>
                      </div>
                    )}
                    {selectedInclusions.length > 0 && <div className="order-2 h-[10.5cqw] w-px bg-[#beb16b]/25" />}
                    <div className={selectedInclusions.length ? "order-1" : "justify-self-start text-left"}>
                      <p className="font-secondary text-[.65cqw] font-light tracking-[.22em]">NAME</p>
                      <p className="mt-[.8cqw] font-primary text-[1.85cqw] leading-none font-light">{content.guestName}</p>
                      {content.voucherType === "dated" ? (
                        <div className="mt-[2.25cqw] grid grid-cols-2 gap-[2.2cqw]">
                          <div><p className="font-secondary text-[.58cqw] font-light tracking-[.2em]">CHECK-IN</p><p className="mt-[.55cqw] font-primary text-[1.02cqw] leading-none font-light whitespace-nowrap">{content.checkInDate}</p><p className="mt-[.55cqw] font-secondary text-[.58cqw] font-medium tracking-[.13em]">{content.checkInTime}</p></div>
                          <div><p className="font-secondary text-[.58cqw] font-light tracking-[.2em]">CHECK-OUT</p><p className="mt-[.55cqw] font-primary text-[1.02cqw] leading-none font-light whitespace-nowrap">{content.checkOutDate}</p><p className="mt-[.55cqw] font-secondary text-[.58cqw] font-medium tracking-[.13em]">{content.checkOutTime}</p></div>
                        </div>
                      ) : (
                        <div className="mt-[3cqw]"><p className="font-secondary text-[.58cqw] font-light tracking-[.2em]">REDEEM BEFORE</p><p className="mt-[.7cqw] font-primary text-[1.65cqw] leading-none font-light">{content.redeemDate}</p></div>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-[#beb16b]/40 pt-[1.25cqw]">
                    <div className="grid grid-cols-[4.2cqw_1fr_auto] items-center gap-[1.6cqw]">
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
