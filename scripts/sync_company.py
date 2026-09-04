#!/usr/bin/env python3
import json, os, re, sys, urllib.parse, urllib.request
from pathlib import Path
from datetime import datetime, timezone

TAX_ID = os.environ.get("TAX_ID","").strip()
if not re.fullmatch(r"\d{8}", TAX_ID):
    print("ERROR: TAX_ID 必須是 8 碼數字")
    sys.exit(2)

BASE = "https://data.gcis.nat.gov.tw/od/data/api"
COMPANY_ID = "5F64D864-61CB-4D0D-8AD9-492047CC1EA6"
BUSINESS_ID = "236EE382-4942-41A9-BD03-CA0709025E7C"

def get_json(url):
    req=urllib.request.Request(url,headers={
        "User-Agent":"GitHub-Actions-Company-Search/3.0",
        "Accept":"application/json"
    })
    with urllib.request.urlopen(req,timeout=45) as r:
        return json.loads(r.read().decode("utf-8-sig"))

def api_url(api_id, filt):
    q=urllib.parse.urlencode({
        "$format":"json","$filter":filt,"$skip":"0","$top":"1000"
    })
    return f"{BASE}/{api_id}?{q}"

def main():
    try:
        cdata=get_json(api_url(COMPANY_ID, f"Business_Accounting_NO eq {TAX_ID}"))
    except Exception as e:
        print("公司 API 取得失敗：",repr(e))
        print("請確認經濟部 API 介接權限/來源 IP 白名單。")
        sys.exit(10)

    rows=cdata if isinstance(cdata,list) else cdata.get("value",[])
    if not rows:
        print("查無公司資料：",TAX_ID)
        sys.exit(11)

    company=rows[0]
    try:
        bdata=get_json(api_url(BUSINESS_ID, f"Cmp_Business eq {TAX_ID}"))
        business=bdata if isinstance(bdata,list) else bdata.get("value",[])
    except Exception as e:
        print("所營事業 API 取得失敗，仍保留公司基本資料：",repr(e))
        business=[]

    out={
        "company":company,
        "business":business,
        "source":{
            "company":"經濟部商業發展署公司登記基本資料-應用一",
            "business":"經濟部商業發展署公司登記基本資料-應用三",
            "synced_at":datetime.now(timezone.utc).isoformat()
        }
    }
    path=Path("data/companies")/TAX_ID[:2]/f"{TAX_ID}.json"
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding="utf-8")
    print("已寫入",path)

if __name__=="__main__":
    main()
