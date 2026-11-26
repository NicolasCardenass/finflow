import { escapeLike } from "./transactions.service.js";

describe("escapeLike", () => {
  it("escapes LIKE wildcards and the escape character", () => {
    expect(escapeLike("100%_off\\now")).toBe("100\\%\\_off\\\\now");
    expect(escapeLike("plain text")).toBe("plain text");
  });
});
