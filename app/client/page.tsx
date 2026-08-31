"use client";
import { payForApi } from "@/utils/client";

const Page = () => {
  const handlePayForAgentApi = async () => {
    await payForApi();
  };

  return (
    <div>
      <button onClick={handlePayForAgentApi}>Pay for Agent API</button>
    </div>
  );
};

export default Page;
