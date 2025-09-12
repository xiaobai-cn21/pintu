import sys
import os
import pymysql
from dotenv import load_dotenv


def main():
    if len(sys.argv) < 2:
        print("用法: python scripts/delete_puzzles_by_title.py <title1> [title2] [title3] ...")
        sys.exit(1)
    
    titles = sys.argv[1:]
    print(f"准备删除关卡: {', '.join(titles)}")

    # 读取 .env
    load_dotenv()
    host = os.getenv("MYSQL_HOST")
    user = os.getenv("MYSQL_USER")
    password = os.getenv("MYSQL_PASSWORD")
    dbname = os.getenv("MYSQL_DB")
    port = int(os.getenv("MYSQL_PORT") or "3306")

    if not all([host, user, password, dbname]):
        print("环境变量不完整，请检查 .env 中的 MYSQL_HOST/MYSQL_USER/MYSQL_PASSWORD/MYSQL_DB/MYSQL_PORT")
        sys.exit(1)

    # 连接 MySQL
    conn = pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=dbname,
        port=port,
        charset="utf8mb4",
        autocommit=False,
        cursorclass=pymysql.cursors.DictCursor,
    )
    try:
        with conn.cursor() as cur:
            # 先查询要删除的关卡
            print("查询待删除关卡...")
            placeholders = ','.join(['%s'] * len(titles))
            cur.execute(
                f"SELECT puzzle_id, title, image_url, is_system_level FROM puzzles "
                f"WHERE title IN ({placeholders})",
                titles
            )
            rows = cur.fetchall()
            
            if not rows:
                print("未找到匹配的关卡。")
                return
            
            print(f"找到 {len(rows)} 个关卡：")
            for r in rows:
                print(f"  ID: {r['puzzle_id']}, 标题: {r['title']}, 系统关卡: {r['is_system_level']}")
            
            # 确认删除
            confirm = input("确认删除这些关卡吗？(y/N): ")
            if confirm.lower() != 'y':
                print("取消删除操作。")
                return
            
            # 删除关卡
            print("执行删除...")
            cur.execute(
                f"DELETE FROM puzzles WHERE title IN ({placeholders})",
                titles
            )
            affected = cur.rowcount
            conn.commit()
            print(f"删除完成，受影响行数: {affected}")
            
            # 验证
            cur.execute(
                f"SELECT COUNT(*) AS cnt FROM puzzles WHERE title IN ({placeholders})",
                titles
            )
            left = cur.fetchone()["cnt"]
            print(f"删除后剩余匹配关卡数: {left}")

    except Exception as e:
        conn.rollback()
        print("删除失败，已回滚：", str(e))
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
