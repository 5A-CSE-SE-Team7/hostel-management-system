import { it, expect, vi } from 'vitest';
import { getReportCsv } from '../pages/report-api';
it('CSV boundary retains credentials and standard authorization errors', async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({message:'Access denied',requestId:'csv-request'}),{status:403,headers:{'content-type':'application/json'}}));vi.stubGlobal('fetch',fetch);
 await expect(getReportCsv('/reports/occupancy?format=csv')).rejects.toMatchObject({status:403,requestId:'csv-request'});
 expect(fetch.mock.calls[0][1]).toMatchObject({credentials:'include',redirect:'error',headers:{Accept:'text/csv'}});
});
it('CSV boundary rejects success responses with the wrong media type',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{headers:{'content-type':'application/json'}})));
 await expect(getReportCsv('/reports/occupancy?format=csv')).rejects.toThrow('unexpected report format');
});
