import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getBinancePrice,
  getBinanceFees,
  getLeverageBrackets,
  getMainSymbols,
  getSymbolDisplayName,
} from "./binance";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  binance: router({
    // 获取主流币种列表
    symbols: publicProcedure.query(() => {
      const symbols = getMainSymbols();
      return symbols.map((symbol) => ({
        symbol,
        displayName: getSymbolDisplayName(symbol),
      }));
    }),

    // 获取币种的实时价格
    price: publicProcedure
      .input(z.object({ symbol: z.string() }))
      .query(async ({ input }) => {
        try {
          const price = await getBinancePrice(input.symbol);
          return { success: true, price };
        } catch (error) {
          console.error(
            `[API] Failed to fetch price for ${input.symbol}:`,
            error
          );
          return {
            success: false,
            error: "Failed to fetch price from Binance",
          };
        }
      }),

    // 获取交易手续费
    fees: publicProcedure
      .input(
        z.object({
          apiKey: z.string().optional(),
          apiSecret: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          // 验证客户端提供的API密钥
          if (
            (input.apiKey && !input.apiSecret) ||
            (!input.apiKey && input.apiSecret)
          ) {
            return {
              success: false,
              error: "API key and secret must both be provided or both be empty",
            };
          }

          const fees = await getBinanceFees(input.apiKey, input.apiSecret);
          return {
            success: true,
            makerCommission: fees.makerCommission,
            takerCommission: fees.takerCommission,
          };
        } catch (error) {
          console.error("[API] Failed to fetch fees:", error);
          return {
            success: false,
            error: "Failed to fetch fees from Binance",
          };
        }
      }),

    // 获取杠杆交易维持保证金率
    leverageBrackets: publicProcedure
      .input(
        z.object({
          symbol: z.string(),
          apiKey: z.string().optional(),
          apiSecret: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          // 验证客户端提供的API密钥
          if (
            (input.apiKey && !input.apiSecret) ||
            (!input.apiKey && input.apiSecret)
          ) {
            return {
              success: false,
              error: "API key and secret must both be provided or both be empty",
            };
          }

          const brackets = await getLeverageBrackets(
            input.symbol,
            input.apiKey,
            input.apiSecret
          );
          const lowestBracket =
            brackets.leverageBrackets[brackets.leverageBrackets.length - 1];
          return {
            success: true,
            maintMarginRatio: lowestBracket.maintMarginRatio,
            initialLeverage: lowestBracket.initialLeverage,
            brackets: brackets.leverageBrackets,
          };
        } catch (error) {
          console.error(
            `[API] Failed to fetch leverage brackets for ${input.symbol}:`,
            error
          );
          return {
            success: false,
            error: "Failed to fetch leverage brackets from Binance",
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;

