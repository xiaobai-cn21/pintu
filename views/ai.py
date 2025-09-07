from flask import Blueprint, request, jsonify
import urllib.parse
ai = Blueprint('ai', __name__)


@ai.route('/generate', methods=['POST'])
def generate():
    try:
        data  = request.form
        prompt = data.get('prompt')
        if not prompt:
            return jsonify({"code":400, "message": "参数缺失", "data": None})

        bit_prompt = f"{prompt}+8-bit 像素画风格"
        encoded_prompt = urllib.parse.quote(bit_prompt)
        url = "https://image.pollinations.ai/prompt/" + encoded_prompt
        
        return jsonify({"code":200, "message": "生成成功", "data": {"url": url}})
    except Exception as e:
        return jsonify({"code":500, "message": f"服务器内部错误: {str(e)}", "data": None})